const { generateCertificate } = require('../../src/services/pdfService');

describe('PDF Service', () => {
  const certData = {
    cert_id: 'CERT-202401-TEST01',
    recipient_name: 'John Doe',
    recipient_email: 'john@example.com',
    course_name: 'Cybersecurity Fundamentals',
    issue_date: '2024-01-15',
    issue_date_formatted: 'January 15, 2024',
    issued_by: 'FalconSec Intelligence',
    qr_code: null,
  };

  test('generates PDF buffer', async () => {
    const buffer = await generateCertificate(certData, {});
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  test('PDF starts with PDF header', async () => {
    const buffer = await generateCertificate(certData, {});
    expect(buffer.toString('utf8', 0, 4)).toBe('%PDF');
  });

  test('handles missing optional fields', async () => {
    const minimalData = {
      cert_id: 'CERT-TEST',
      recipient_name: 'Jane',
      course_name: 'Test Course',
      issue_date: '2024-01-01',
    };
    const buffer = await generateCertificate(minimalData, {});
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test('uses template config colors', async () => {
    const template = {
      config: {
        primaryColor: '#000000',
        accentColor: '#ffffff',
        watermark: 'TEST',
      },
    };
    const buffer = await generateCertificate(certData, template);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });
});
