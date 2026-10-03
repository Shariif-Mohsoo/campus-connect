import dns from 'dns';
// Set public DNS servers for MongoDB SRV resolution
dns.setServers(['1.1.1.1', '8.8.8.8']);

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './shared/config/env.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { connectDB, getDbStatus, setupGracefulShutdown } from './shared/database/connection.js';
import { seedDatabase } from './shared/database/seed.js';

// Modular Feature Routes
import authRoutes from './features/auth/auth.routes.js';
import organizerRoutes from './features/organizers/organizer.routes.js';
import notificationsRoutes from './features/notifications/notifications.routes.js';
import sportsRoutes from './features/sports/sports.routes.js';
import cultureRoutes from './features/culture/culture.routes.js';
import techRoutes from './features/tech/tech.routes.js';
import categoryRoutes from './features/categories/category.routes.js';
import eventsRoutes from './features/events/events.routes.js';

const app = express();
const PORT = config.port;

// Production Security & Middleware Configuration
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Feature-Based API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/organizers', organizerRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/culture', cultureRoutes);
app.use('/api/tech', techRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/events', eventsRoutes);

// Backward Compatibility Aliases (so any existing client endpoints seamlessly work)
app.use('/api/auth/organizers', organizerRoutes);
app.use('/api/auth/outbox', notificationsRoutes);

// System Health Check with Database Connectivity State
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStatus();
  res.json({
    status: 'healthy',
    product: 'UniActivity Hub API (Production Architecture)',
    version: '3.0.0-mongo-persistent',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Root API Welcome & Feature Sitemap
app.get('/api', (req, res) => {
  res.json({
    message: 'UniActivity Hub Modular Backend API Ready.',
    features: {
      auth: '/api/auth',
      organizers: '/api/organizers',
      notifications: '/api/notifications',
      sports: '/api/sports',
      culture: '/api/culture',
      tech: '/api/tech',
      categories: '/api/categories',
      events: '/api/events',
      health: '/api/health'
    }
  });
});

// Centralized Global Error Handler
app.use(errorHandler);

const server = app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🚀 UniActivity Hub Server Active on Port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log('====================================================');

  // Initiate MongoDB connection using DNS configuration and production pool
  try {
    const conn = await connectDB();
    if (conn) {
      console.log('DB connection successful!');
      await seedDatabase();
    } else {
      console.log('DB connection standby (server running with in-memory sync engine)');
    }
  } catch (err) {
    console.log('DB connection error:', err.message);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use by another running process.`);
    console.error(`👉 Solution: A server is already running on port ${PORT}.`);
    console.error(`   To free port ${PORT}, run: npx kill-port ${PORT} (or stop the other running terminal/process).\n`);
    process.exit(1);
  } else {
    console.error('[Server Listen Error]', err);
  }
});

// Setup graceful process shutdown
setupGracefulShutdown(server);

// Production clean start
export default app;
