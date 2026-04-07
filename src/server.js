require('dotenv').config();
const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');

const PORT = config.port || 3000;

const server = app.listen(PORT, () => {
  logger.info(`FalconSec Certificate Platform running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = server;
