const { generateCertId, generateSerialNumber, formatDate, sanitizeFilename, paginate } = require('../../src/utils/helpers');

describe('Helpers', () => {
  test('generateCertId returns correct format', () => {
    const id = generateCertId();
    expect(id).toMatch(/^CERT-\d{6}-[A-F0-9]{6}$/);
  });

  test('generateSerialNumber returns hex string', () => {
    const sn = generateSerialNumber();
    expect(sn).toMatch(/^[A-F0-9]{16}$/);
  });

  test('formatDate formats correctly', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('January 15, 2024');
  });

  test('sanitizeFilename removes special chars', () => {
    const result = sanitizeFilename('hello world!@#.pdf');
    expect(result).toBe('hello_world___.pdf');
  });

  test('paginate calculates correctly', () => {
    const result = paginate(2, 10);
    expect(result).toEqual({ page: 2, limit: 10, offset: 10 });
  });

  test('paginate defaults to page 1', () => {
    const result = paginate();
    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });
});
