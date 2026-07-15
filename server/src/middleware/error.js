import { ApiError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: { message: 'Route not found' } });
}

 
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  // MySQL duplicate entry -> 409
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { message: 'Resource already exists' } });
  }

   
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(env.isProd ? {} : { detail: err.message }),
    },
  });
}
