const { getDb } = require('../database/db');

// Whitelist of updatable column names for SQL safety
const UPDATABLE_FIELDS = new Set(['name', 'description', 'config', 'is_active']);

class TemplateModel {
  create(data) {
    const db = getDb();
    const config = typeof data.config === 'object' ? JSON.stringify(data.config) : data.config;
    const stmt = db.prepare('INSERT INTO templates (name, description, config, is_active) VALUES (?, ?, ?, ?)');
    const result = stmt.run(
      data.name,
      data.description || '',
      config,
      data.is_active !== undefined ? data.is_active : 1
    );
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    const db = getDb();
    const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    if (t && t.config) t.config = JSON.parse(t.config);
    return t;
  }

  findAll() {
    const db = getDb();
    const templates = db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
    return templates.map(t => { if (t.config) t.config = JSON.parse(t.config); return t; });
  }

  findActive() {
    const db = getDb();
    const templates = db.prepare('SELECT * FROM templates WHERE is_active = 1 ORDER BY created_at DESC').all();
    return templates.map(t => { if (t.config) t.config = JSON.parse(t.config); return t; });
  }

  update(id, data) {
    const db = getDb();
    // Only allow whitelisted field names to prevent SQL injection via column names
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([k]) => UPDATABLE_FIELDS.has(k))
    );
    if (Object.keys(updateData).length === 0) return this.findById(id);
    if (updateData.config && typeof updateData.config === 'object') {
      updateData.config = JSON.stringify(updateData.config);
    }
    const fields = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE templates SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(
      ...Object.values(updateData),
      id
    );
    return this.findById(id);
  }

  delete(id) {
    const db = getDb();
    return db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  }
}

module.exports = new TemplateModel();
