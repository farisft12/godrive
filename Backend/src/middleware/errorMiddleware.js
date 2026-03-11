const { getDiskUsage, WARN_THRESHOLD_PERCENT } = require('../utils/diskHelper');

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.code === 'LIMIT_FILE_SIZE') {
    const { getChunkLimitBytes } = require('../middleware/uploadMiddleware');
    const limitMb = getChunkLimitBytes() / (1024 * 1024);
    return res.status(413).json({ error: 'File too large', limit_mb: limitMb });
  }
  if (err.message && err.message.includes('File type not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message && (err.message.includes('multipart') || err.message.includes('boundary') || err.message.includes('Unexpected end of form'))) {
    return res.status(400).json({ error: 'Invalid multipart request. Ensure Content-Type is multipart/form-data with boundary.' });
  }

  if (err.code === 'JWT_SECRET_MISSING') {
    return res.status(503).json({
      error: 'Server misconfiguration: JWT_SECRET is not set. Add JWT_SECRET to Backend/.env and restart.',
    });
  }
  if (err.code === 'ECONNREFUSED' && (err.message || '').toLowerCase().includes('connect')) {
    const isProd = process.env.NODE_ENV === 'production';
    return res.status(503).json({
      error: isProd ? 'Service temporarily unavailable' : 'Database connection refused. Check PostgreSQL is running and Backend/.env (PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD).',
    });
  }
  if (err.code === '42P01') {
    return res.status(503).json({
      error: 'Database table missing. Run migrations: npm run db:migrate in Backend folder.',
    });
  }

  console.error('Error:', err);
  const isClientError = status >= 400 && status < 500;
  const is501 = status === 501;
  const responseMessage = (isClientError || is501) ? message : (process.env.NODE_ENV === 'production' ? 'Something went wrong' : message);
  res.status(status).json({
    error: responseMessage,
  });
}

async function logStorageWarningIfNeeded() {
  const usage = await getDiskUsage();
  if (usage.warning) {
    console.warn(
      `[GoDrive] Storage usage is ${usage.usagePercent}% (threshold: ${WARN_THRESHOLD_PERCENT}%). Consider upgrading storage.`
    );
  }
}

module.exports = { errorMiddleware, logStorageWarningIfNeeded };
