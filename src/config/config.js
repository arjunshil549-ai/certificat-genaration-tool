require('dotenv').config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'falconsec-default-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || './data/certificates.db',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'FalconSec Intelligence <noreply@falconsec.com>',
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    email: process.env.ADMIN_EMAIL || 'admin@falconsec.com',
  },
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE) || 1000,
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
};
