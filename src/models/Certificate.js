const { getDb } = require('../database/db');

// Whitelist of updatable column names for SQL safety
const UPDATABLE_FIELDS = new Set([
  'recipient_name', 'recipient_email', 'course_name', 'issue_date', 'expiry_date',
  'issued_by', 'template_id', 'pdf_path', 'qr_code', 'status',
]);

class CertificateModel {
  create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO certificates
        (cert_id, recipient_name, recipient_email, course_name, issue_date, expiry_date,
         issued_by, template_id, pdf_path, qr_code, status, created_by)
      VALUES
        (@cert_id, @recipient_name, @recipient_email, @course_name, @issue_date, @expiry_date,
         @issued_by, @template_id, @pdf_path, @qr_code, @status, @created_by)
    `);
    const result = stmt.run(data);
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  }

  findByCertId(certId) {
    const db = getDb();
    return db.prepare('SELECT * FROM certificates WHERE cert_id = ?').get(certId);
  }

  findAll(filters = {}, pagination = { limit: 20, offset: 0 }) {
    const db = getDb();
    let query = 'SELECT * FROM certificates WHERE 1=1';
    const params = [];
    if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
    if (filters.course_name) { query += ' AND course_name LIKE ?'; params.push(`%${filters.course_name}%`); }
    if (filters.recipient_email) { query += ' AND recipient_email LIKE ?'; params.push(`%${filters.recipient_email}%`); }
    if (filters.created_by) { query += ' AND created_by = ?'; params.push(filters.created_by); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pagination.limit, pagination.offset);
    return db.prepare(query).all(...params);
  }

  count(filters = {}) {
    const db = getDb();
    let query = 'SELECT COUNT(*) as count FROM certificates WHERE 1=1';
    const params = [];
    if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
    if (filters.course_name) { query += ' AND course_name LIKE ?'; params.push(`%${filters.course_name}%`); }
    if (filters.recipient_email) { query += ' AND recipient_email LIKE ?'; params.push(`%${filters.recipient_email}%`); }
    if (filters.created_by) { query += ' AND created_by = ?'; params.push(filters.created_by); }
    const result = db.prepare(query).get(...params);
    return result.count;
  }

  search(query, filters = {}) {
    const db = getDb();
    const searchTerm = `%${query}%`;
    let sql = `SELECT * FROM certificates WHERE
      (recipient_name LIKE ? OR recipient_email LIKE ? OR cert_id LIKE ? OR course_name LIKE ?)`;
    const params = [searchTerm, searchTerm, searchTerm, searchTerm];
    if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    return db.prepare(sql).all(...params);
  }

  update(id, data) {
    const db = getDb();
    // Only allow whitelisted field names to prevent SQL injection via column names
    const safeData = Object.fromEntries(
      Object.entries(data).filter(([k]) => UPDATABLE_FIELDS.has(k))
    );
    if (Object.keys(safeData).length === 0) return this.findById(id);
    const fields = Object.keys(safeData).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE certificates SET ${fields} WHERE id = ?`).run(...Object.values(safeData), id);
    return this.findById(id);
  }

  delete(id) {
    const db = getDb();
    return db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
  }

  getStats() {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as count FROM certificates').get().count;
    const thisMonth = db.prepare(
      "SELECT COUNT(*) as count FROM certificates WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    ).get().count;
    const active = db.prepare("SELECT COUNT(*) as count FROM certificates WHERE status = 'active'").get().count;
    const revoked = db.prepare("SELECT COUNT(*) as count FROM certificates WHERE status = 'revoked'").get().count;
    return { total, thisMonth, active, revoked };
  }
}

module.exports = new CertificateModel();
