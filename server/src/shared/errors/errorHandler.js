/**
 * Global API Error Handling Middleware
 * Provides standardized error formatting across all modules.
 */
export const errorHandler = (err, req, res, next) => {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};
