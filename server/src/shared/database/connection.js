import dns from 'dns';
// Ensure public DNS servers for MongoDB SRV resolution
dns.setServers(['1.1.1.1', '8.8.8.8']);

import mongoose from 'mongoose';
import { config } from '../config/env.js';

let isConnected = false;
let connectionPromise = null;

/**
 * Mask sensitive credentials from MongoDB URI for safe logging
 */
export function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '[REDACTED_URI]';
  return uri.replace(/\/\/(.*?)@/, '//****:****@');
}

/**
 * Connect to MongoDB with production-grade pool and timeout configuration
 */
export async function connectDB(customUri = null) {
  const uri = customUri || process.env.MONGODB_URI || config.mongodbUri;

  if (!uri) {
    console.warn('⚠️ [MongoDB] No MONGODB_URI configured in environment variables.');
    return null;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const masked = maskMongoUri(uri);
  console.log(`🔌 [MongoDB] Connecting to database (${masked})...`);

  const connectionOptions = {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    autoIndex: true
  };

  connectionPromise = mongoose.connect(uri, connectionOptions)
    .then((conn) => {
      isConnected = true;
      connectionPromise = null;
      console.log(`✅ [MongoDB] Connected successfully to database: "${conn.connection.name}" on host: "${conn.connection.host}"`);
      return conn.connection;
    })
    .catch((err) => {
      isConnected = false;
      connectionPromise = null;
      console.error(`❌ [MongoDB] Connection error: ${err.message}. Retrying in 4s...`);
      setTimeout(() => connectDB(uri), 4000);
      return null;
    });

  // Setup connection event listeners once
  if (!mongoose.connection._hasRegisteredListeners) {
    mongoose.connection._hasRegisteredListeners = true;

    mongoose.connection.on('connected', () => {
      isConnected = true;
      console.log('📡 [MongoDB] Connection established.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('⚠️ [MongoDB] Runtime connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️ [MongoDB] Disconnected from database.');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('🔄 [MongoDB] Reconnected to database.');
    });
  }

  return connectionPromise;
}

/**
 * Disconnect from MongoDB gracefully
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    connectionPromise = null;
    console.log('🛑 [MongoDB] Disconnected cleanly.');
  }
}

/**
 * Health check helper to query MongoDB status safely
 */
export function getDbStatus() {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const state = mongoose.connection.readyState;
  return {
    state: stateMap[state] || 'unknown',
    isConnected: state === 1,
    databaseName: state === 1 ? mongoose.connection.name : null,
    host: state === 1 ? mongoose.connection.host : null
  };
}

/**
 * Setup graceful process shutdown hooks
 */
export function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    console.log(`\n⏳ [Process] Received ${signal}. Starting graceful shutdown...`);
    try {
      if (server && server.close) {
        await new Promise((resolve) => server.close(resolve));
        console.log('🔒 [Server] HTTP server closed.');
      }
      await disconnectDB();
      console.log('👋 [Process] Exiting gracefully.');
      process.exit(0);
    } catch (err) {
      console.error('❌ [Process] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
