import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { Client } from '../client/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { OrdersDetail } from '../orders_detail/entities/orders_detail.entity';
import { Topping } from '../topping/entities/topping.entity';
import { Payment_method, Sale, SaleType, SalesStatus } from '../sale/entities/sale.entity';
import { SaleDetail } from '../sale_detail/entities/sale_detail.entity';
import { StockAlert } from '../stock_alert/entities/stock_alert.entity';
import { OrdersGateway } from './orders.gateway';

describe('OrdersService', () => {
  let service: OrdersService;
  let stockAlertRepository: any;
  let orderRepository: any;
  let productRepository: any;
  let saleRepository: any;
  let saleDetailRepository: any;

  const createRepository = () => ({
    manager: { connection: { createQueryRunner: jest.fn() } },
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(async (value) => value),
    increment: jest.fn(),
  });

  beforeEach(async () => {
    stockAlertRepository = createRepository();
    orderRepository = createRepository();
    productRepository = createRepository();
    saleRepository = createRepository();
    saleDetailRepository = createRepository();
    saleDetailRepository.create.mockImplementation((value) => value);
    saleDetailRepository.remove = jest.fn(async (details) => details);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: getRepositoryToken(Client), useValue: createRepository() },
        { provide: getRepositoryToken(User), useValue: createRepository() },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(OrdersDetail), useValue: createRepository() },
        { provide: getRepositoryToken(Topping), useValue: createRepository() },
        { provide: getRepositoryToken(Sale), useValue: saleRepository },
        { provide: getRepositoryToken(SaleDetail), useValue: saleDetailRepository },
        { provide: getRepositoryToken(StockAlert), useValue: stockAlertRepository },
        { provide: OrdersGateway, useValue: { notifyOrderCreated: jest.fn(), notifyOrderUpdated: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('normaliza correctamente los tipos de pedido', () => {
    const result = (service as any).normalizeOrderType('programado');
    expect(result).toBe('scheduled');
  });

  it('retorna delivery por defecto cuando el tipo es desconocido', () => {
    const result = (service as any).normalizeOrderType('desconocido');
    expect(result).toBe('delivery');
  });

  it.each(['scheduled', 'delivery'] as const)('registra el pago del pedido %s sin marcarlo como entregado', async (orderType) => {
    const user = { id: 'user-1', isActive: true };
    const product = { id: 'product-1', name: 'Helado', price: 12, current_stock: 5, isActive: true, promotion: null };
    const stockRepositoryForTransaction = {
      findOne: jest.fn().mockResolvedValue({ id: product.id, current_stock: 5, name: product.name }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const savedEntities: Array<{ entity: unknown; value: any }> = [];
    const manager = {
      findOne: jest.fn(async (entity: unknown) => entity === User ? user : entity === Product ? product : null),
      create: jest.fn((_entity: unknown, value: any) => value),
      query: jest.fn().mockResolvedValue([{ current_stock: 4 }]),
      save: jest.fn(async (entity: unknown, value: any) => {
        savedEntities.push({ entity, value });
        return value;
      }),
      getRepository: jest.fn((entity: unknown) => entity === Product ? stockRepositoryForTransaction : stockAlertRepository),
    };
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    };
    productRepository.manager.connection.createQueryRunner.mockReturnValue(queryRunner);
    stockAlertRepository.findOne.mockResolvedValue(null);

    await service.create({
      userId: user.id,
      orderType,
      ...(orderType === 'scheduled' && { scheduledAt: '2026-10-09T12:00:00.000Z' }),
      paymentType: Payment_method.IN_QR,
      details: [{ productId: product.id, quantity: 1, toppingIds: [] }],
    } as any);

    const savedOrder = savedEntities.find(({ entity }) => entity === Order)?.value;
    const savedSale = savedEntities.find(({ entity }) => entity === Sale)?.value;

    expect(savedOrder.status).toBe('pending');
    expect(savedOrder.stock_reserved).toBe(true);
    expect(savedSale).toMatchObject({
      total: 12,
      payment_method: Payment_method.IN_QR,
      type: SaleType.DELIVERY,
      status: SalesStatus.DELIVERED,
    });
    expect(savedSale.order).toBe(savedOrder);
    expect(savedSale.saleDetail).toHaveLength(1);
    expect(manager.query).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('bloquea la preparación de un programado antiguo sin reserva e informa stock disponible', async () => {
    const order = {
      id: 'scheduled-order',
      type: 'scheduled',
      stock_reserved: false,
      status: 'pending',
      details: [{ product: { id: 'product-1', name: 'Helado' }, quantity: 30 }],
    };
    orderRepository.findOne.mockResolvedValue(order);
    productRepository.find.mockResolvedValue([{
      id: 'product-1',
      name: 'Helado',
      current_stock: 10,
    }]);

    await expect(service.update('scheduled-order', { status: 'preparing' } as any))
      .rejects.toThrow('No se puede iniciar la preparación del pedido: solo hay 10 unidades de Helado y se necesitan 30');

    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(productRepository.increment).not.toHaveBeenCalled();
  });

  it('permite reservar al llegar al mínimo de stock si hay unidades disponibles', async () => {
    const product = { id: 'product-1', name: 'Helado', current_stock: 1 };
    const manager = {
      query: jest.fn().mockResolvedValue([{ current_stock: 0 }]),
    };

    await expect((service as any).reserveStock(product, 1, manager)).resolves.toBeUndefined();
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('current_stock" >= $1'),
      [1, product.id],
    );
  });

  it('informa el stock disponible cuando la reserva supera el inventario', async () => {
    const product = { id: 'product-1', name: 'Helado' };
    const manager = {
      query: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ current_stock: 10 }]),
    };

    await expect((service as any).reserveStock(product, 30, manager))
      .rejects.toThrow('hay 10 unidades y se necesitan 30');
  });

  it('permite modificar un pedido pagado sin cambiar la venta registrada', async () => {
    const sale = { id: 'sale-1', status: SalesStatus.DELIVERED };
    const order = { id: 'order-paid', type: 'scheduled', stock_reserved: false, status: 'pending', sale, details: [] };
    orderRepository.findOne.mockResolvedValue(order);

    await service.update('order-paid', { notes: 'Cambio' } as any);

    expect(orderRepository.save).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Cambio', sale }));
    expect(saleRepository.save).not.toHaveBeenCalled();
  });

  it('restaura la reserva anterior y aplica la nueva cantidad al editar domicilio', async () => {
    const oldProduct = { id: 'product-1', current_stock: 4, minimum_stock: 0 };
    const updatedProduct = { id: 'product-1', name: 'Helado', price: 12, current_stock: 4, minimum_stock: 0, promotion: null };
    const sale = {
      id: 'sale-1',
      status: SalesStatus.DELIVERED,
      saleDetail: [{ id: 'sale-detail-old' }],
    };
    const order = {
      id: 'delivery-order',
      type: 'delivery',
      stock_reserved: true,
      status: 'pending',
      sale,
      client: null,
      details: [{ product: oldProduct, quantity: 1 }],
    };
    orderRepository.findOne.mockResolvedValue(order);
    productRepository.find.mockResolvedValue([updatedProduct]);
    const orderDetailRepository = (service as any).ordersDetailRepository;
    orderDetailRepository.create.mockImplementation((value) => value);
    orderDetailRepository.remove = jest.fn(async (details) => details);
    saleDetailRepository.create.mockImplementation((value) => value);
    saleDetailRepository.remove = jest.fn(async (details) => details);
    jest.spyOn(service as any, 'reserveStock').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'syncStockAlert').mockResolvedValue(undefined);

    await service.update('delivery-order', {
      details: [{ productId: updatedProduct.id, quantity: 3, toppingIds: [] }],
    } as any);

    expect(productRepository.increment).toHaveBeenCalledWith({ id: oldProduct.id }, 'current_stock', 1);
    expect((service as any).reserveStock).toHaveBeenCalledWith(updatedProduct, 3, productRepository.manager);
    expect(sale.total).toBe(36);
  });

  it('sincroniza el total y los productos de la venta al editar un pedido pagado', async () => {
    const oldSaleDetail = { id: 'sale-detail-old' };
    const sale = {
      id: 'sale-1',
      status: SalesStatus.DELIVERED,
      payment_method: Payment_method.IN_QR,
      total: 12,
      saleDetail: [oldSaleDetail],
    };
    const oldProduct = { id: 'old-product', current_stock: 1, minimum_stock: 0 };
    const newProduct = {
      id: 'new-product',
      name: 'Helado',
      price: 12,
      current_stock: 3,
      minimum_stock: 0,
      promotion: null,
    };
    const order = {
      id: 'order-paid',
      type: 'scheduled',
      stock_reserved: false,
      status: 'pending',
      sale,
      client: null,
      total: 12,
      details: [{ product: { id: oldProduct.id }, quantity: 1 }],
    };
    orderRepository.findOne.mockResolvedValue(order);
    productRepository.find.mockResolvedValue([newProduct]);
    productRepository.save.mockImplementation(async (value) => value);
    orderRepository.save.mockImplementation(async (value) => value);
    const orderDetailRepository = (service as any).ordersDetailRepository;
    orderDetailRepository.create.mockImplementation((value) => value);
    orderDetailRepository.remove = jest.fn(async (details) => details);
    jest.spyOn(service as any, 'getAvailableStock').mockResolvedValue({
      normalizedQuantity: 2,
      availableStock: 3,
      productRepository: {},
    });
    jest.spyOn(service as any, 'reserveStock').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'syncStockAlert').mockResolvedValue(undefined);

    await service.update('order-paid', {
      details: [{ productId: newProduct.id, quantity: 2, toppingIds: [] }],
    } as any);

    expect(saleDetailRepository.remove).toHaveBeenCalledWith([oldSaleDetail]);
    expect(saleRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      total: 24,
      payment_method: Payment_method.IN_QR,
      saleDetail: [expect.objectContaining({
        product: newProduct,
        quantity: 2,
        subtotal: 24,
      })],
    }));
    expect(productRepository.increment).not.toHaveBeenCalled();
  });

  it('exige una razón para cancelar un pedido pagado', async () => {
    orderRepository.findOne.mockResolvedValue({
      id: 'order-paid',
      status: 'pending',
      sale: { status: SalesStatus.DELIVERED },
      details: [],
    });

    await expect(service.remove('order-paid')).rejects.toThrow('La razón de cancelación es obligatoria');
    expect(productRepository.increment).not.toHaveBeenCalled();
  });

  it('cancela un pedido programado sin reponer stock que no se descontó', async () => {
    const sale = { id: 'sale-scheduled', status: SalesStatus.DELIVERED };
    orderRepository.findOne.mockResolvedValue({
      id: 'scheduled-order',
      type: 'scheduled',
      stock_reserved: false,
      status: 'pending',
      sale,
      details: [{ quantity: 2, product: { id: 'product-1' } }],
    });

    await service.remove('scheduled-order', 'El cliente canceló');

    expect(productRepository.increment).not.toHaveBeenCalled();
    expect(saleRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: sale.id,
      status: SalesStatus.CANCELED,
      reason: 'El cliente canceló',
    }));
  });

  it('permite marcar como entregado un pedido pagado sin crear otra venta', async () => {
    const existingSale = { id: 'sale-1', status: SalesStatus.DELIVERED };
    const order = { id: 'order-paid', type: 'scheduled', stock_reserved: false, status: 'ready', sale: existingSale, details: [] };
    orderRepository.findOne.mockResolvedValue(order);
    saleRepository.findOne.mockResolvedValue(existingSale);
    productRepository.find.mockResolvedValue([]);

    await service.update('order-paid', { status: 'delivered' } as any);

    expect(orderRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'delivered', sale: existingSale }));
    expect(saleRepository.save).not.toHaveBeenCalled();
  });

  it('descuenta del inventario un pedido programado recién al entregarlo', async () => {
    const existingSale = { id: 'sale-1', status: SalesStatus.DELIVERED };
    const product = { id: 'product-1', name: 'Helado', current_stock: 4, minimum_stock: 0 };
    const order = {
      id: 'scheduled-order',
      type: 'scheduled',
      stock_reserved: false,
      status: 'ready',
      sale: existingSale,
      details: [{ product, quantity: 2 }],
    };
    orderRepository.findOne.mockResolvedValue(order);
    saleRepository.findOne.mockResolvedValue(existingSale);
    productRepository.find.mockResolvedValue([product]);
    productRepository.findOne.mockResolvedValue(product);
    jest.spyOn(service as any, 'reserveStock').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'syncStockAlert').mockResolvedValue(undefined);

    await service.update('scheduled-order', { status: 'delivered' } as any);

    expect((service as any).reserveStock).toHaveBeenCalledWith(product, 2, productRepository.manager);
  });

  it('crea alerta cuando el stock está en el mínimo pero sigue siendo positivo', async () => {
    stockAlertRepository.findOne.mockResolvedValue(null);
    const product = { id: 'prod-1', name: 'Sprite 600 ml', current_stock: 15, minimum_stock: 15 } as any;

    await (service as any).syncStockAlert(product);

    expect(stockAlertRepository.create).toHaveBeenCalled();
  });

  it('crea alerta cuando el stock llega a cero', async () => {
    stockAlertRepository.findOne.mockResolvedValue(null);
    const product = { id: 'prod-2', name: 'Sprite 600 ml', current_stock: 0, minimum_stock: 15 } as any;

    await (service as any).syncStockAlert(product);

    expect(stockAlertRepository.create).toHaveBeenCalled();
  });

  it('anula un pedido y repone el stock de cada línea con incrementos atómicos', async () => {
    orderRepository.findOne.mockResolvedValue({
      id: 'order-1',
      type: 'delivery',
      stock_reserved: true,
      status: 'pending',
      details: [
        { quantity: 2, product: { id: 'prod-1', name: 'Cupcake', current_stock: 10 } },
        { quantity: 1, product: { id: 'prod-1', name: 'Cupcake', current_stock: 10 } },
      ],
    });
    productRepository.findOne.mockResolvedValue({ id: 'prod-1', name: 'Cupcake', current_stock: 13, minimum_stock: 3 });
    stockAlertRepository.findOne.mockResolvedValue(null);

    const result = await service.remove('order-1');

    expect(productRepository.increment).toHaveBeenNthCalledWith(1, { id: 'prod-1' }, 'current_stock', 2);
    expect(productRepository.increment).toHaveBeenNthCalledWith(2, { id: 'prod-1' }, 'current_stock', 1);
    expect(orderRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    expect(result.message).toBe('Pedido cancelado correctamente');
  });

  it('no permite cancelar un pedido ya cancelado', async () => {
    orderRepository.findOne.mockResolvedValue({ id: 'order-2', status: 'cancelled', details: [] });
    await expect(service.remove('order-2')).rejects.toThrow('El pedido ya está cancelado');
  });
});
