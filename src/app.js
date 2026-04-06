const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../docs/swagger');
const { runMigrations } = require('./database/migrations');

const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');
const templateRoutes = require('./routes/templates');
const userRoutes = require('./routes/users');
const emailRoutes = require('./routes/email');
const statsRoutes = require('./routes/stats');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Run migrations on startup
runMigrations();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors());

// Rate limiting for API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Generous rate limit for frontend routes (prevents resource exhaustion)
const frontendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: false,
  legacyHeaders: false,
});
app.use('/', frontendLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FalconSec Certificate Platform is running',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend for unknown routes (except API) — rate limited
app.get('*', frontendLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
