/**
 * Production-Ready Server Logger
 * Provides clean, structured logging and avoids terminal clutter in production.
 */
const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  info: (msg, ...args) => {
    console.log(`[INFO] ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    if (!isProduction || process.env.DEBUG) {
      console.warn(`[WARN] ${msg}`, ...args);
    }
  },
  error: (msg, ...args) => {
    console.error(`[ERROR] ${msg}`, ...args);
  },
  db: (action, err) => {
    if (!isProduction || process.env.DEBUG) {
      console.warn(`[DB:${action}] ${err?.message || err}`);
    }
  }
};
