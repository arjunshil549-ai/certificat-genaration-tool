require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');
const config = require('../config/config');
const logger = require('../utils/logger');

function runMigrations() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin','manager','user')),
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cert_id TEXT UNIQUE NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      course_name TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      issued_by TEXT,
      template_id INTEGER,
      pdf_path TEXT,
      qr_code TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','revoked','expired')),
      created_at TEXT DEFAULT (datetime('now')),
      created_by INTEGER,
      FOREIGN KEY (template_id) REFERENCES templates(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_id INTEGER,
      recipient_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
      sent_at TEXT,
      error_msg TEXT,
      FOREIGN KEY (certificate_id) REFERENCES certificates(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  logger.info('Database tables created/verified');

  // Seed admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get(config.admin.username);
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync(config.admin.password, 10);
    db.prepare(
      `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')`
    ).run(config.admin.username, config.admin.email, passwordHash);
    logger.info('Admin user created successfully');
  }

  // Seed default template
  const templateExists = db.prepare('SELECT id FROM templates WHERE name = ?').get('FalconSec Standard');
  if (!templateExists) {
    const defaultConfig = JSON.stringify({
      backgroundColor: '#ffffff',
      primaryColor: '#1a237e',
      accentColor: '#c62828',
      fontFamily: 'Helvetica',
      borderStyle: 'double',
      logoUrl: null,
      watermark: 'FALCONSEC INTELLIGENCE',
    });
    db.prepare(
      `INSERT INTO templates (name, description, config) VALUES (?, ?, ?)`
    ).run('FalconSec Standard', 'Standard FalconSec Intelligence certificate', defaultConfig);
    logger.info('Default template created');
  }

  logger.info('Migrations completed successfully');
}

module.exports = { runMigrations };

if (require.main === module) {
  runMigrations();
}
