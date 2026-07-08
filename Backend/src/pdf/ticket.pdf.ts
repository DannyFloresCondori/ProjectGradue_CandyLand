import PDFDocument = require('pdfkit');
import { Sale } from 'src/sale/entities/sale.entity';

export async function generateTicketPdf(sale: Sale): Promise<Buffer> {
  const saleDetails = Array.isArray(sale?.saleDetail) ? sale.saleDetail : [];

  const doc = new PDFDocument({
    size: [220, 800],
    margins: { top: 8, left: 8, right: 8, bottom: 8 },
  });

  const chunks: Buffer[] = [];

  // Colores Tailwind
  const colors = {
    primary: { r: 231, g: 84, b: 128 }, // #E75480
    gray300: { r: 209, g: 213, b: 219 }, // #d1d5db
    gray400: { r: 156, g: 163, b: 175 }, // #9ca3af
    gray500: { r: 107, g: 114, b: 128 }, // #6b7280
  };

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header con línea punteada
    doc.fillColor(colors.primary.r, colors.primary.g, colors.primary.b)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('🍦 CandyLand', { align: 'center' });
    
    doc.fillColor('black')
      .font('Helvetica')
      .fontSize(7)
      .text('Heladería Artesanal', { align: 'center' });
    
    doc.fontSize(6)
      .fillColor(colors.gray400.r, colors.gray400.g, colors.gray400.b)
      .text('Cochabamba, Bolivia', { align: 'center' });
    
    doc.moveDown(0.4);
    doc.strokeColor(colors.gray300.r, colors.gray300.g, colors.gray300.b)
      .dash(2, { space: 2 })
      .moveTo(8, doc.y)
      .lineTo(212, doc.y)
      .stroke()
      .undash();
    doc.moveDown(0.4);

    // Ticket info
    doc.fillColor('black').font('Helvetica').fontSize(7);
    doc.text(`Ticket: #${(sale?.id ?? '').slice(-6).toUpperCase()}`);
    doc.text(`Fecha: ${new Date(sale?.createdAt ?? new Date()).toLocaleString('es-BO')}`);
    const registeredBy = sale?.user?.name ?? 'Sistema';
    const roleName = sale?.user?.role?.name ?? 'cajero';
    doc.text(`Registrado por: ${registeredBy} (${roleName})`);
    if (sale?.client?.full_name) {
      doc.text(`Cliente: ${sale.client.full_name}`);
    }
    doc.moveDown(0.4);

    // Tabla header
    doc.fillColor(colors.gray500.r, colors.gray500.g, colors.gray500.b)
      .font('Helvetica-Bold')
      .fontSize(6.5);
    doc.text('Producto', 8, doc.y);
    doc.text('Cant.', 108, doc.y, { width: 20 });
    doc.text('P.Unit.', 134, doc.y, { width: 25 });
    doc.text('Subtotal', 166, doc.y, { width: 46, align: 'right' });
    doc.moveDown(0.3);

    // Línea de separación punteada
    doc.strokeColor(colors.gray300.r, colors.gray300.g, colors.gray300.b)
      .dash(2, { space: 2 })
      .moveTo(8, doc.y)
      .lineTo(212, doc.y)
      .stroke()
      .undash();
    doc.moveDown(0.3);

    // Details
    doc.fillColor('black').font('Helvetica').fontSize(6.5);
    for (const detail of saleDetails) {
      const name = detail?.product?.name ?? 'Producto';
      const quantity = detail?.quantity ?? 0;
      const toppings = Array.isArray(detail?.toppings) ? detail.toppings : [];
      const priceUnique = Number(detail?.priceUnique ?? 0);
      const subtotal = Number(detail?.subtotal ?? 0);
      const discountApplied = Number(detail?.discountApplied ?? 0);
      const priceUniqueFormatted = `Bs. ${priceUnique.toFixed(2)}`;
      const subtotalFormatted = `Bs. ${subtotal.toFixed(2)}`;
      const promotionName = detail?.product?.promotion?.name ?? null;

      doc.text(name.substring(0, 32), 8, doc.y, { width: 96 });
      doc.text(String(quantity), 108, doc.y, { width: 20 });
      doc.text(priceUniqueFormatted, 134, doc.y, { width: 25 });
      doc.text(subtotalFormatted, 166, doc.y, { width: 46, align: 'right' });
      if (toppings.length > 0) {
        doc.moveDown(0.12);
        doc.fillColor(colors.gray500.r, colors.gray500.g, colors.gray500.b)
          .font('Helvetica-Oblique')
          .fontSize(5.2)
          .text(`Toppings: ${toppings.map((t) => t.name).join(', ')}`, 8, doc.y, { width: 204 });
        doc.fillColor('black').font('Helvetica').fontSize(6.5);
      }
      if (discountApplied > 0) {
        const promoText = promotionName ? `Desc. ${discountApplied}% · ${promotionName}` : `Desc. ${discountApplied}%`;
        doc.moveDown(0.15);
        doc.fillColor(colors.primary.r, colors.primary.g, colors.primary.b)
          .font('Helvetica-Oblique')
          .fontSize(5.5)
          .text(promoText, 8, doc.y, { width: 204 });
        doc.fillColor('black').font('Helvetica').fontSize(6.5);
      }
      doc.moveDown(0.25);
    }

    // Línea de separación punteada
    doc.moveDown(0.2);
    doc.strokeColor(colors.gray300.r, colors.gray300.g, colors.gray300.b)
      .dash(2, { space: 2 })
      .moveTo(8, doc.y)
      .lineTo(212, doc.y)
      .stroke()
      .undash();
    doc.moveDown(0.3);

    // Total
    doc.fillColor(colors.primary.r, colors.primary.g, colors.primary.b)
      .font('Helvetica-Bold')
      .fontSize(9);
    doc.text('TOTAL', 8, doc.y);
    doc.text(`Bs. ${Number(sale?.total ?? 0).toFixed(2)}`, 166, doc.y, { width: 46, align: 'right' });
    doc.moveDown(0.5);

    // Payment method
    doc.fillColor('black').font('Helvetica').fontSize(7);
    const paymentMethod = sale?.payment_method === 'in_qr' ? 'QR' : 'Efectivo';
    doc.text(`Pago: ${paymentMethod}`, { align: 'center' });
    doc.moveDown(0.4);

    // Línea punteada antes del footer
    doc.strokeColor(colors.gray300.r, colors.gray300.g, colors.gray300.b)
      .dash(2, { space: 2 })
      .moveTo(8, doc.y)
      .lineTo(212, doc.y)
      .stroke()
      .undash();
    doc.moveDown(0.4);

    // Footer
    doc.fillColor(colors.gray400.r, colors.gray400.g, colors.gray400.b)
      .fontSize(6)
      .text('¡Gracias por su compra!', { align: 'center' });

    doc.end();
  });
}