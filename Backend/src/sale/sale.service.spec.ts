import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SaleService } from './sale.service';
import { Sale, SalesStatus } from './entities/sale.entity';
import { Order } from '../orders/entities/order.entity';
import { Client } from '../client/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { SaleDetail } from '../sale_detail/entities/sale_detail.entity';
import { StockAlert } from '../stock_alert/entities/stock_alert.entity';
import { Topping } from '../topping/entities/topping.entity';
import { PromotionType } from '../promotions/entities/promotion.entity';

describe('SaleService', () => {
  let service: SaleService;
  let manager: any;
  let queryRunner: any;

  const stockAlertRepository = { findOne: jest.fn(), create: jest.fn((v) => v), save: jest.fn() };

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      query: jest.fn(),
      save: jest.fn(async (_entity, value) => value),
      getRepository: jest.fn(() => stockAlertRepository),
    };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    };
    const saleRepository = { manager: { connection: { createQueryRunner: () => queryRunner } } };
    const repo = () => ({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaleService,
        { provide: getRepositoryToken(Sale), useValue: saleRepository },
        { provide: getRepositoryToken(Order), useValue: repo() },
        { provide: getRepositoryToken(Client), useValue: repo() },
        { provide: getRepositoryToken(User), useValue: repo() },
        { provide: getRepositoryToken(Product), useValue: repo() },
        { provide: getRepositoryToken(SaleDetail), useValue: repo() },
        { provide: getRepositoryToken(StockAlert), useValue: stockAlertRepository },
        { provide: getRepositoryToken(Topping), useValue: repo() },
      ],
    }).compile();

    service = module.get<SaleService>(SaleService);
    jest.clearAllMocks();
  });

  const saleWithTwoLinesOfSameProduct = () => ({
    id: 'sale-1',
    status: SalesStatus.DELIVERED,
    saleDetail: [
      { quantity: 2, product: { id: 'prod-1', name: 'Cupcake', current_stock: 10, minimum_stock: 3 } },
      { quantity: 3, product: { id: 'prod-1', name: 'Cupcake', current_stock: 10, minimum_stock: 3 } },
    ],
  });

  it('anula una venta, repone el stock de cada línea y registra el motivo', async () => {
    const sale = saleWithTwoLinesOfSameProduct();
    manager.findOne.mockImplementation(async (entity: unknown) =>
      entity === Sale ? sale : { id: 'prod-1', name: 'Cupcake', current_stock: 15, minimum_stock: 3 },
    );

    const result = await service.remove('sale-1', 'Producto equivocado');

    expect(manager.query).toHaveBeenNthCalledWith(1, expect.stringContaining('current_stock + $1'), [2, 'prod-1']);
    expect(manager.query).toHaveBeenNthCalledWith(2, expect.stringContaining('current_stock + $1'), [3, 'prod-1']);
    expect(sale.status).toBe(SalesStatus.CANCELED);
    expect((sale as any).reason).toBe('Producto equivocado');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(result.message).toBe('Venta cancelada correctamente');
  });

  it('exige el motivo de la anulación y no modifica el stock', async () => {
    manager.findOne.mockResolvedValue(saleWithTwoLinesOfSameProduct());

    await expect(service.remove('sale-1', '   ')).rejects.toThrow(BadRequestException);
    expect(manager.query).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('cancela un pedido programado pendiente sin reponer stock no descontado', async () => {
    const order = { id: 'order-scheduled', type: 'scheduled', stock_reserved: false, status: 'pending' };
    const sale = { ...saleWithTwoLinesOfSameProduct(), order };
    manager.findOne.mockImplementation(async (entity: unknown) => entity === Sale ? sale : null);

    await service.remove('sale-1', 'El cliente ya no lo necesita');

    expect(manager.query).not.toHaveBeenCalled();
    expect(order.status).toBe('cancelled');
    expect(manager.save).toHaveBeenCalledWith(Order, order);
  });

  it('repone una venta programada entregada y marca su reserva como devuelta', async () => {
    const order = { id: 'order-scheduled', type: 'scheduled', stock_reserved: true, status: 'delivered' };
    const sale = { ...saleWithTwoLinesOfSameProduct(), order };
    manager.findOne.mockImplementation(async (entity: unknown) =>
      entity === Sale ? sale : { id: 'prod-1', name: 'Cupcake', current_stock: 15, minimum_stock: 3 },
    );

    await service.remove('sale-1', 'Venta anulada');

    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(order.stock_reserved).toBe(false);
    expect(manager.save).toHaveBeenCalledWith(Order, order);
  });

  it('no permite anular dos veces la misma venta', async () => {
    manager.findOne.mockResolvedValue({ ...saleWithTwoLinesOfSameProduct(), status: SalesStatus.CANCELED });

    await expect(service.remove('sale-1', 'Duplicado')).rejects.toThrow('La venta ya está cancelada');
  });

  it('aplica un descuento porcentual vigente al precio unitario', () => {
    const promotion = { is_active: true, type: PromotionType.DISCOUNT, value: 20, end_date: '2999-12-31' } as any;
    const result = (service as any).applyPromotion(10, 3, promotion);
    expect(result).toEqual({ finalPrice: 8, discountApplied: 20, subtotal: 24 });
  });

  it('aplica la promoción 2x1 cobrando solo la mitad de las unidades (redondeo hacia arriba)', () => {
    const promotion = { is_active: true, type: PromotionType.BUY_ONE_GET_ONE, end_date: '2999-12-31' } as any;
    const result = (service as any).applyPromotion(10, 3, promotion);
    expect(result.subtotal).toBe(20);
  });

  it('no aplica una promoción vencida', () => {
    const promotion = { is_active: true, type: PromotionType.DISCOUNT, value: 20, end_date: '2000-01-01' } as any;
    const result = (service as any).applyPromotion(10, 2, promotion);
    expect(result).toEqual({ finalPrice: 10, discountApplied: 0, subtotal: 20 });
  });
});
