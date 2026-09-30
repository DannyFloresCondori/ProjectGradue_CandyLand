import PDFDocument = require('pdfkit');
import { existsSync } from 'fs';
import { join } from 'path';
import { Sale } from 'src/sale/entities/sale.entity';

function getBusinessLogoPath(): string | null {
  const candidates = [
    join(process.cwd(), '../Frontend/src/assets/Logo.jpeg'),
    join(__dirname, '../../../Frontend/src/assets/Logo.jpeg'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

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
  const columns = {
    left: 8,
    right: 212,
    product: { x: 8, width: 82 },
    quantity: { x: 90, width: 22 },
    unitPrice: { x: 112, width: 44 },
    subtotal: { x: 156, width: 56 },
  };

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header con el logo del negocio junto al nombre
    const logoPath = getBusinessLogoPath();
    const headerY = doc.y;
    if (logoPath) {
      doc.image(logoPath, 34, headerY, { fit: [24, 24] });
    }

    doc.fillColor(colors.primary.r, colors.primary.g, colors.primary.b)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('CandyLand', logoPath ? 60 : 8, headerY + 5, {
        width: logoPath ? 102 : 204,
        align: 'center',
      });
    doc.y = headerY + 28;
    
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
      .moveTo(columns.left, doc.y)
      .lineTo(columns.right, doc.y)
      .stroke()
      .undash();
    doc.moveDown(0.4);

    // Ticket info
    doc.fillColor('black').font('Helvetica').fontSize(7);
    doc.text(`Ticket: #${(sale?.id ?? '').slice(-6).toUpperCase()}`, columns.left, doc.y, { width: columns.right - columns.left });
    doc.text(`Fecha: ${new Date(sale?.createdAt ?? new Date()).toLocaleString('es-BO')}`, columns.left, doc.y, { width: columns.right - columns.left });
    const registeredBy = sale?.user?.name ?? 'Sistema';
    const roleName = sale?.user?.role?.name ?? 'cajero';
      doc.text(`Registrado por: ${registeredBy} (${roleName})`, columns.left, doc.y, { width: columns.right - columns.left });
    if (sale?.client?.full_name) {
      doc.text(`Cliente: ${sale.client.full_name}`, columns.left, doc.y, { width: columns.right - columns.left });
    }
    doc.moveDown(0.4);

    // Tabla header
    doc.fillColor(colors.gray500.r, colors.gray500.g, colors.gray500.b)
      .font('Helvetica-Bold')
      .fontSize(6.5);
    const tableHeaderY = doc.y;
    doc.text('Producto', columns.product.x, tableHeaderY, { width: columns.product.width, align: 'left' });
    doc.text('Cant.', columns.quantity.x, tableHeaderY, { width: columns.quantity.width, align: 'center' });
    doc.text('P.Unit.', columns.unitPrice.x, tableHeaderY, { width: columns.unitPrice.width, align: 'center' });
    doc.text('Subtotal', columns.subtotal.x, tableHeaderY, { width: columns.subtotal.width, align: 'right' });
    doc.moveDown(0.3);

    // Línea de separación punteada
    doc.strokeColor(colors.gray300.r, colors.gray300.g, colors.gray300.b)
      .dash(2, { space: 2 })
      .moveTo(columns.left, doc.y)
      .lineTo(columns.right, doc.y)
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

      const rowY = doc.y;
      const productHeight = doc.heightOfString(name, {
        width: columns.product.width,
        lineGap: 0,
      });
      doc.text(name, columns.product.x, rowY, {
        width: columns.product.width,
        lineGap: 0,
      });
      doc.text(String(quantity), columns.quantity.x, rowY, {
        width: columns.quantity.width,
        align: 'center',
        lineGap: 0,
      });
      doc.text(priceUniqueFormatted, columns.unitPrice.x, rowY, {
        width: columns.unitPrice.width,
        align: 'center',
        lineGap: 0,
        lineBreak: false,
      });
      doc.text(subtotalFormatted, columns.subtotal.x, rowY, {
        width: columns.subtotal.width,
        align: 'right',
        lineGap: 0,
        lineBreak: false,
      });
      doc.y = rowY + Math.max(productHeight, 8);
      if (toppings.length > 0) {
        doc.moveDown(0.12);
        doc.fillColor(colors.gray500.r, colors.gray500.g, colors.gray500.b)
          .font('Helvetica-Oblique')
          .fontSize(5.2)
          .text(`Toppings: ${toppings.map((t) => t.name).join(', ')}`, columns.left, doc.y, { width: columns.right - columns.left });
        doc.fillColor('black').font('Helvetica').fontSize(6.5);
      }
      if (discountApplied > 0) {
        const promoText = promotionName ? `Desc. ${discountApplied}% · ${promotionName}` : `Desc. ${discountApplied}%`;
        doc.moveDown(0.15);
        doc.fillColor(colors.primary.r, colors.primary.g, colors.primary.b)
          .font('Helvetica-Oblique')
          .fontSize(5.5)
          .text(promoText, columns.left, doc.y, { width: columns.right - columns.left });
        doc.fillColor('black').font('Helvetica').fontSize(6.5);
      }
      doc.moveDown(0.25);
    }

    // Línea de separación punteada
    doc.moveDown(0.2);
    doc.strokeColor(colors.gray300.r, colors.gray300.g, colors.gray300.b)
      .dash(2, { space: 2 })
      .moveTo(columns.left, doc.y)
      .lineTo(columns.right, doc.y)
      .stroke()
      .undash();
    doc.moveDown(0.3);

    // Total
    doc.fillColor(colors.primary.r, colors.primary.g, colors.primary.b)
      .font('Helvetica-Bold')
      .fontSize(9);
    const totalY = doc.y;
    doc.text('TOTAL', columns.left, totalY, { width: columns.product.width });
    doc.text(`Bs. ${Number(sale?.total ?? 0).toFixed(2)}`, columns.subtotal.x, totalY, { width: columns.subtotal.width, align: 'right', lineBreak: false });
    doc.moveDown(0.5);

    // Payment method
    doc.fillColor('black').font('Helvetica').fontSize(7);
    const paymentMethod = sale?.payment_method === 'in_qr' ? 'QR' : 'Efectivo';
    doc.text(`Pago: ${paymentMethod}`, columns.left, doc.y, { width: columns.right - columns.left, align: 'right' });
    doc.moveDown(0.4);

    // Línea punteada antes del footer
    doc.strokeColor(colors.gray300.r, colors.gray300.g, colors.gray300.b)
      .dash(2, { space: 2 })
      .moveTo(columns.left, doc.y)
      .lineTo(columns.right, doc.y)
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