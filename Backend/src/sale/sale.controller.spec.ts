jest.mock('./sale.service', () => ({
  SaleService: jest.fn(),
}));

import { generateTicketPdf } from '../pdf/ticket.pdf';
import { SaleController } from './sale.controller';

describe('SaleController ticket endpoint', () => {
  it('should generate a PDF ticket successfully', async () => {
    const sale = {
      createdAt: new Date('2026-06-24T16:35:50.000Z'),
      client: { full_name: 'Ana Pérez' },
      user: { name: 'Carlos' },
      total: 42.5,
      payment_method: 'in_efective',
      saleDetail: [
        {
          product: { name: 'Gomitas' },
          quantity: 2,
          priceUnique: 15,
          subtotal: 30,
        },
      ],
    } as any;

    const buffer = await generateTicketPdf(sale);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('should return the PDF inline for browser preview', async () => {
    const generateTicket = jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4'));
    const controller = new SaleController({ generateTicket } as any);

    const res = {
      set: jest.fn().mockReturnThis(),
      end: jest.fn(),
    } as any;

    await controller.getTicket('123e4567-e89b-12d3-a456-426614174000', res);

    expect(generateTicket).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="ticket-123e4567-e89b-12d3-a456-426614174000.pdf"',
      }),
    );
    expect(res.end).toHaveBeenCalledWith(Buffer.from('%PDF-1.4'));
  });
});
