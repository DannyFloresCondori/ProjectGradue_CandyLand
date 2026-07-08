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

describe('OrdersService', () => {
  let service: OrdersService;
  let stockAlertRepository: any;

  const createRepository = () => ({
    manager: { connection: { createQueryRunner: jest.fn() } },
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    stockAlertRepository = createRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: createRepository() },
        { provide: getRepositoryToken(Client), useValue: createRepository() },
        { provide: getRepositoryToken(User), useValue: createRepository() },
        { provide: getRepositoryToken(Product), useValue: createRepository() },
        { provide: getRepositoryToken(OrdersDetail), useValue: createRepository() },
        { provide: getRepositoryToken(Topping), useValue: createRepository() },
        { provide: getRepositoryToken(Sale), useValue: createRepository() },
        { provide: getRepositoryToken(SaleDetail), useValue: createRepository() },
        { provide: getRepositoryToken(StockAlert), useValue: stockAlertRepository },
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
});
