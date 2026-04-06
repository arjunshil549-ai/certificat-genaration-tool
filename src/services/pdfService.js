const PDFDocument = require('pdfkit');

async function generateCertificate(certData, template = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 0,
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const cfg = (template && template.config) ? template.config : {};
    const primaryColor = cfg.primaryColor || '#1a237e';
    const accentColor = cfg.accentColor || '#c62828';
    const bgColor = cfg.backgroundColor || '#ffffff';

    const W = doc.page.width;
    const H = doc.page.height;

    // Background
    doc.rect(0, 0, W, H).fill(bgColor);

    // Outer border
    doc.rect(15, 15, W - 30, H - 30).lineWidth(3).strokeColor(primaryColor).stroke();

    // Inner border
    doc.rect(22, 22, W - 44, H - 44).lineWidth(1).strokeColor(accentColor).stroke();

    // Top decorative bar
    doc.rect(15, 15, W - 30, 8).fill(primaryColor);

    // Bottom decorative bar
    doc.rect(15, H - 23, W - 30, 8).fill(primaryColor);

    // Left accent bar
    doc.rect(15, 15, 8, H - 30).fill(accentColor);

    // Right accent bar
    doc.rect(W - 23, 15, 8, H - 30).fill(accentColor);

    // Header - Organization Name
    doc.font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(accentColor)
      .text('FALCONSEC INTELLIGENCE', 0, 45, { align: 'center', characterSpacing: 4 });

    // Decorative line under header
    const lineY = 65;
    doc.moveTo(W * 0.3, lineY).lineTo(W * 0.7, lineY).lineWidth(1).strokeColor(primaryColor).stroke();

    // Certificate Title
    doc.font('Helvetica-Bold')
      .fontSize(36)
      .fillColor(primaryColor)
      .text('CERTIFICATE OF COMPLETION', 0, 80, { align: 'center' });

    // "This is to certify that"
    doc.font('Helvetica')
      .fontSize(13)
      .fillColor('#444444')
      .text('This is to certify that', 0, 135, { align: 'center' });

    // Recipient Name
    doc.font('Helvetica-Bold')
      .fontSize(30)
      .fillColor(accentColor)
      .text(certData.recipient_name || '', 0, 158, { align: 'center' });

    // Underline for name
    const nameWidth = Math.min(300, ((certData.recipient_name || '').length) * 18);
    doc.moveTo(W / 2 - nameWidth / 2, 198)
      .lineTo(W / 2 + nameWidth / 2, 198)
      .lineWidth(1.5).strokeColor(accentColor).stroke();

    // "has successfully completed"
    doc.font('Helvetica')
      .fontSize(13)
      .fillColor('#444444')
      .text('has successfully completed', 0, 208, { align: 'center' });

    // Course Name
    doc.font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(primaryColor)
      .text(certData.course_name || '', 0, 232, { align: 'center' });

    // Issue date and issued by section
    const colY = 278;

    doc.font('Helvetica').fontSize(10).fillColor('#666666')
      .text('Date of Issue', W * 0.2, colY, { align: 'center', width: W * 0.2 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333')
      .text(certData.issue_date_formatted || certData.issue_date || '', W * 0.2, colY + 15, { align: 'center', width: W * 0.2 });

    doc.font('Helvetica').fontSize(10).fillColor('#666666')
      .text('Certificate ID', W * 0.4, colY, { align: 'center', width: W * 0.2 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333')
      .text(certData.cert_id || '', W * 0.4, colY + 15, { align: 'center', width: W * 0.2 });

    doc.font('Helvetica').fontSize(10).fillColor('#666666')
      .text('Issued By', W * 0.6, colY, { align: 'center', width: W * 0.2 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333')
      .text(certData.issued_by || 'FalconSec Intelligence', W * 0.6, colY + 15, { align: 'center', width: W * 0.2 });

    // QR Code
    if (certData.qr_code) {
      try {
        const base64Data = certData.qr_code.split(',')[1];
        const qrBuffer = Buffer.from(base64Data, 'base64');
        doc.image(qrBuffer, W - 130, H - 140, { width: 100, height: 100 });
        doc.font('Helvetica').fontSize(7).fillColor('#999999')
          .text('Scan to verify', W - 130, H - 38, { width: 100, align: 'center' });
      } catch (e) {
        // QR code rendering failed, skip it
      }
    }

    // Signature line
    doc.moveTo(W * 0.25, H - 55).lineTo(W * 0.45, H - 55).lineWidth(1).strokeColor('#cccccc').stroke();
    doc.font('Helvetica').fontSize(9).fillColor('#666666')
      .text('Authorized Signature', W * 0.25, H - 45, { width: W * 0.2, align: 'center' });

    // Watermark
    if (cfg.watermark) {
      doc.save();
      doc.opacity(0.04);
      doc.font('Helvetica-Bold').fontSize(48).fillColor(primaryColor)
        .rotate(-35, { origin: [W / 2, H / 2] })
        .text(cfg.watermark, W * 0.1, H * 0.35, { align: 'center', width: W * 0.8 });
      doc.restore();
    }

    doc.end();
  });
}

module.exports = { generateCertificate };
