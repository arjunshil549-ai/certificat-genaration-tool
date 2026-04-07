process.env.DB_PATH = './data/test.db';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app');
const { closeDb } = require('../../src/database/db');

let token;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = loginRes.body.data.token;
});

afterAll(() => {
  closeDb();
});

describe('Certificates API', () => {
  let certId;

  test('POST /api/certificates - generate certificate', async () => {
    const res = await request(app)
      .post('/api/certificates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipient_name: 'Jane Smith',
        recipient_email: 'jane@example.com',
        course_name: 'Ethical Hacking',
        issue_date: '2024-01-15',
        issued_by: 'FalconSec Intelligence',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cert_id).toBeDefined();
    certId = res.body.data.cert_id;
  });

  test('GET /api/certificates - list certificates', async () => {
    const res = await request(app)
      .get('/api/certificates')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.certificates)).toBe(true);
  });

  test('GET /api/certificates/verify/:certId - verify certificate', async () => {
    const res = await request(app)
      .get(`/api/certificates/verify/${certId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_valid).toBe(true);
  });

  test('GET /api/certificates/verify/:certId - invalid cert', async () => {
    const res = await request(app)
      .get('/api/certificates/verify/INVALID-CERT-ID');
    expect(res.status).toBe(404);
  });

  test('GET /api/certificates/:id/download - download PDF', async () => {
    const listRes = await request(app)
      .get('/api/certificates')
      .set('Authorization', `Bearer ${token}`);
    const cert = listRes.body.data.certificates[0];

    const res = await request(app)
      .get(`/api/certificates/${cert.id}/download`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });
});
