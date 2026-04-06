const { getDb } = require('../database/db');

class UserModel {
  create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (@username, @email, @password_hash, @role)
    `);
    const result = stmt.run(data);
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    const db = getDb();
    return db.prepare(
      'SELECT id, username, email, role, is_active, last_login, created_at, updated_at FROM users WHERE id = ?'
    ).get(id);
  }

  findByUsername(username) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  findByEmail(email) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  findAll(filters = {}) {
    const db = getDb();
    let query = 'SELECT id, username, email, role, is_active, last_login, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }
    query += ' ORDER BY created_at DESC';
    return db.prepare(query).all(...params);
  }

  update(id, data) {
    const db = getDb();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(
      ...Object.values(data),
      id
    );
    return this.findById(id);
  }

  delete(id) {
    const db = getDb();
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  updateLastLogin(id) {
    const db = getDb();
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(id);
  }
}

module.exports = new UserModel();
