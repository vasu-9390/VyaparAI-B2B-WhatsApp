import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { Money } from '../../utils/money.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const PdfService = {
  /**
   * Generate branded vector PDF quotation with embedded UPI payment QR code
   * Returns a Promise resolving to the local file path
   */
  async generateQuotationPdf(quotation, organization, customer) {
    const storageDir = path.resolve(env.STORAGE_DIR);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileName = `Quotation_${quotation.quotationNumber}_v${quotation.version}.pdf`;
    const filePath = path.join(storageDir, fileName);

    // 1. Generate dynamic UPI QR Code Buffer
    const upiVpa = organization.settings?.upiVpa || 'merchant@upi';
    const grandTotalRupees = Money.toRupees(quotation.grandTotalPaise).toFixed(2);
    const upiUri = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(organization.name)}&am=${grandTotalRupees}&cu=INR&tn=${encodeURIComponent(`Quotation ${quotation.quotationNumber}`)}`;

    let qrImageBuffer = null;
    try {
      qrImageBuffer = await QRCode.toBuffer(upiUri, {
        width: 130,
        margin: 1,
        color: { dark: '#111827', light: '#ffffff' },
      });
    } catch (qrErr) {
      logger.warn('Failed to generate UPI QR code, proceeding without QR', qrErr);
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // --- Header: Organization Brand ---
      doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text(organization.name.toUpperCase(), 40, 40);
      doc.fontSize(9).font('Helvetica').fillColor('#475569');
      
      const orgAddress = organization.address
        ? `${organization.address.street || ''}, ${organization.address.city || 'Surat'}, ${organization.address.state || 'Gujarat'} - ${organization.address.pincode || ''}`
        : 'Surat, Gujarat, India';
      
      doc.text(orgAddress, 40, 65);
      doc.text(`GSTIN: ${organization.gstin || '24AAACS0000A1Z5'} | Email: ${organization.email || ''} | Phone: ${organization.phone || ''}`, 40, 78);

      doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // --- Quotation Title & Meta Banner ---
      doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('ESTIMATE / PROFORMA QUOTATION', 40, 105);
      
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(`Quotation No: `, 360, 105, { continued: true }).font('Helvetica-Bold').text(quotation.quotationNumber);
      doc.font('Helvetica').text(`Date: `, 360, 120, { continued: true }).text(new Date(quotation.createdAt || Date.now()).toLocaleDateString('en-IN'));
      doc.text(`Valid Until: `, 360, 135, { continued: true }).font('Helvetica-Bold').fillColor('#dc2626').text(new Date(quotation.validUntil).toLocaleDateString('en-IN'));
      doc.fillColor('#334155').font('Helvetica');

      // --- Customer Details Block ---
      doc.roundedRect(40, 140, 300, 75, 4).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('QUOTATION ISSUED TO:', 50, 148);
      doc.font('Helvetica-Bold').fontSize(10).text(customer.companyName, 50, 162);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(`Contact: ${customer.name} | Phone: ${customer.whatsappPhone}`, 50, 176);
      doc.text(`GSTIN: ${customer.gstin || 'Unregistered'} | Category: ${customer.category}`, 50, 190);

      // --- Line Items Table Header ---
      const tableTop = 230;
      doc.roundedRect(40, tableTop, 515, 22, 2).fill('#1e293b');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
      doc.text('#', 45, tableTop + 6, { width: 20 });
      doc.text('Item Description & SKU', 70, tableTop + 6, { width: 170 });
      doc.text('HSN', 245, tableTop + 6, { width: 40 });
      doc.text('Qty', 290, tableTop + 6, { width: 45, align: 'right' });
      doc.text('Rate', 340, tableTop + 6, { width: 55, align: 'right' });
      doc.text('GST', 400, tableTop + 6, { width: 40, align: 'right' });
      doc.text('Total (INR)', 445, tableTop + 6, { width: 100, align: 'right' });

      // --- Line Items Content ---
      let y = tableTop + 26;
      doc.font('Helvetica').fontSize(8.5);

      quotation.lineItems.forEach((item, index) => {
        const isEven = index % 2 === 0;
        if (isEven) {
          doc.rect(40, y - 2, 515, 20).fill('#f8fafc');
        }

        doc.fillColor('#1e293b');
        doc.text(String(index + 1), 45, y, { width: 20 });
        doc.font('Helvetica-Bold').text(item.productName, 70, y, { width: 170, ellipsis: true });
        doc.font('Helvetica').fillColor('#64748b');
        doc.text(item.hsnCode || '-', 245, y, { width: 40 });
        doc.fillColor('#1e293b');
        doc.text(`${item.quantity} ${item.uom}`, 290, y, { width: 45, align: 'right' });
        doc.text(Money.formatINR(item.unitPricePaise, false), 340, y, { width: 55, align: 'right' });
        doc.text(`${item.taxRatePercent}%`, 400, y, { width: 40, align: 'right' });
        doc.font('Helvetica-Bold').text(Money.formatINR(item.lineTotalPaise, false), 445, y, { width: 100, align: 'right' });
        doc.font('Helvetica');

        y += 22;
      });

      doc.moveTo(40, y + 5).lineTo(555, y + 5).strokeColor('#cbd5e1').stroke();
      y += 15;

      // --- Summary Totals & Dynamic UPI QR Code ---
      const summaryTop = y;

      // Left Column: Payment QR Code & Terms
      if (qrImageBuffer) {
        doc.image(qrImageBuffer, 45, summaryTop, { width: 85 });
      }
      doc.fontSize(8).fillColor('#0f172a').font('Helvetica-Bold').text('Scan to Pay via Any UPI App', 140, summaryTop + 5);
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b');
      doc.text(`UPI VPA: ${upiVpa}`, 140, summaryTop + 18);
      doc.text(`Payment Terms: ${quotation.paymentTerms}`, 140, summaryTop + 30);
      doc.text(`Delivery Terms: ${quotation.deliveryTerms}`, 140, summaryTop + 42);

      // Right Column: Financial Calculations
      const rightX = 360;
      doc.fontSize(9).font('Helvetica').fillColor('#475569');
      
      doc.text('Subtotal:', rightX, summaryTop, { width: 90 });
      doc.text(Money.formatINR(quotation.subtotalPaise), 455, summaryTop, { width: 90, align: 'right' });

      if (quotation.discountTotalPaise > 0) {
        doc.text('Discount:', rightX, summaryTop + 16, { width: 90 });
        doc.text(`- ${Money.formatINR(quotation.discountTotalPaise)}`, 455, summaryTop + 16, { width: 90, align: 'right' });
      }

      doc.text('GST Taxes Total:', rightX, summaryTop + 32, { width: 90 });
      doc.text(Money.formatINR(quotation.taxTotalPaise), 455, summaryTop + 32, { width: 90, align: 'right' });

      if (quotation.shippingPaise > 0) {
        doc.text('Shipping & Freight:', rightX, summaryTop + 48, { width: 90 });
        doc.text(Money.formatINR(quotation.shippingPaise), 455, summaryTop + 48, { width: 90, align: 'right' });
      }

      // Grand Total Highlight Box
      const totalY = summaryTop + 66;
      doc.rect(rightX - 10, totalY - 4, 205, 26).fill('#15803d');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
      doc.text('Grand Total:', rightX, totalY + 2, { width: 90 });
      doc.text(Money.formatINR(quotation.grandTotalPaise), 455, totalY + 2, { width: 90, align: 'right' });

      // --- Footer / Signatory ---
      doc.fontSize(8).fillColor('#64748b').font('Helvetica');
      doc.text('This is a computer-generated quotation prepared by VyaparAI. Authorized signature required upon formal acceptance.', 40, 750, { align: 'center', width: 515 });

      doc.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', (err) => reject(err));
    });
  },
};
