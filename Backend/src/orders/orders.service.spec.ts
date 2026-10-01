import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { Client } from '../client/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { OrdersDetail } from '../orders_detail/entities/orders_detail.entity';
import { Topping } from '../topping/entities/topping.entity';
import { Sale } from '../sale/entities/sale.entity';
import { SaleDetail } from '../sale_detail/entities/sale_detail.entity';
import { StockAlert } from '../stock_alert/entities/stock_alert.entity';
import { OrdersGateway } from './orders.gateway';

describe('OrdersService', () => {
  let service: OrdersService;
  let stockAlertRepository: any;
  let orderRepository: any;
  let productRepository: any;

  const createRepository = () => ({
    manager: { connection: { createQueryRunner: jest.fn() } },
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(async (value) => value),
    increment: jest.fn(),
  });

  beforeEach(async () => {
    stockAlertRepository = createRepository();
    orderRepository = createRepository();
    productRepository = createRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: getRepositoryToken(Client), useValue: createRepository() },
        { provide: getRepositoryToken(User), useValue: createRepository() },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(OrdersDetail), useValue: createRepository() },
        { provide: getRepositoryToken(Topping), useValue: createRepository() },
        { provide: getRepositoryToken(Sale), useValue: createRepository() },
        { provide: getRepositoryToken(SaleDetail), useValue: createRepository() },
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
