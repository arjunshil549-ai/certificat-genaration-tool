const QRCode = require('qrcode');

async function generateQR(data) {
  const qrDataUrl = await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: { dark: '#1a237e', light: '#ffffff' },
  });
  return qrDataUrl;
}

module.exports = { generateQR };
