import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { Client } from 'src/client/entities/client.entity';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product.entity';
import { OrdersDetail } from 'src/orders_detail/entities/orders_detail.entity';
import {
  Payment_method,
  Sale,
  SalesStatus,
} from 'src/sale/entities/sale.entity';
import { SaleDetail } from 'src/sale_detail/entities/sale_detail.entity';
import { Topping } from 'src/topping/entities/topping.entity';
import {
  Promotion,
  PromotionType,
} from 'src/promotions/entities/promotion.entity';
import { generateTicketPdf } from 'src/pdf/ticket.pdf';
import { StockAlert } from 'src/stock_alert/entities/stock_alert.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrdersDetail)
    private readonly ordersDetailRepository: Repository<OrdersDetail>,
    @InjectRepository(Topping)
    private readonly toppingRepository: Repository<Topping>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(SaleDetail)
    private readonly saleDetailRepository: Repository<SaleDetail>,
    @InjectRepository(StockAlert)
    private readonly stockAlertRepository: Repository<StockAlert>,
  ) {}

  // ─────────────────────────────────────────────
  // 🎯 HELPER: Aplica promoción si existe y está vigente
  // Para agregar un nuevo tipo → añade un if nuevo aquí
  // ─────────────────────────────────────────────
  private applyPromotion(
    price: number,
    quantity: number,
    promotion: Promotion | null | undefined,
  ): { finalPrice: number; discountApplied: number; subtotal: number } {
    const now = new Date();

    // Sin promoción, inactiva o vencida → precio normal
    if (!promotion || !promotion.is_active || new Date(promotion.end_date) < now) {
      return {
        finalPrice: price,
        discountApplied: 0,
        subtotal: price * quantity,
      };
    }

    // DISCOUNT: descuenta el % del precio unitario
    if (promotion.type === PromotionType.DISCOUNT) {
      const discount = Number(promotion.value) || 0;
      const finalPrice = price - (price * discount) / 100;
      return {
        finalPrice,
        discountApplied: discount,
        subtotal: finalPrice * quantity,
      };
    }

    // 2X1: de cada 2 unidades solo pagas 1
    if (promotion.type === PromotionType.BUY_ONE_GET_ONE) {
      const paidUnits = Math.ceil(quantity / 2);
      return {
        finalPrice: price,
        discountApplied: 50,
        subtotal: price * paidUnits,
      };
    }

    // Fallback → sin descuento
    return {
      finalPrice: price,
      discountApplied: 0,
      subtotal: price * quantity,
    };
  }

  private async reserveStock(product: Product, quantity: number, manager: EntityManager) {
    const normalizedQuantity = Number(quantity ?? 0);

    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 1) {
      throw new BadRequestException('La cantidad solicitada es inválida');
    }

    const productRepository = manager.getRepository(Product);
    const currentProduct = await productRepository.findOne({
      where: { id: product.id },
      select: ['id', 'current_stock', 'name'],
    });

    if (!currentProduct) {
      throw new NotFoundException(`Product with id ${product.id} not found`);
    }

    const availableStock = Number(currentProduct.current_stock ?? 0);
    if (availableStock < normalizedQuantity) {
      throw new BadRequestException(`Stock insuficiente para producto ${product.name}`);
    }

    const result = await productRepository.update(product.id, {
      current_stock: availableStock - normalizedQuantity,
    } as Partial<Product>);

    if (!result.affected || result.affected < 1) {
      throw new BadRequestException(`Stock insuficiente para producto ${product.name}`);
    }

    product.current_stock = availableStock - normalizedQuantity;
  }

  private async syncStockAlert(product: Product, manager?: EntityManager) {
    const stockAlertRepository = manager
      ? manager.getRepository(StockAlert)
      : this.stockAlertRepository;
    const message = `${product.name} llego al minimo de stock`;
    const existingAlert = await stockAlertRepository.findOne({
      where: { product: { id: product.id }, is_resolved: false },
      relations: { product: true },
      order: { alerted_at: 'DESC' },
    });

    const projectedStock = Number(product.current_stock ?? 0);
    const minimumStock = Number(product.minimum_stock ?? 0);

    if (projectedStock <= minimumStock && projectedStock > 0) {
      if (!existingAlert) {
        const alert = stockAlertRepository.create({
          product,
          current_stock: projectedStock,
          minimum_stock: minimumStock,
          is_resolved: false,
          alert_message: message,
        });
        await stockAlertRepository.save(alert);
      }
      return;
    }

    if (projectedStock === 0) {
      if (!existingAlert) {
        const alert = stockAlertRepository.create({
          product,
          current_stock: projectedStock,
          minimum_stock: minimumStock,
          is_resolved: false,
          alert_message: message,
        });
        await stockAlertRepository.save(alert);
      }
      return;
    }

    if (existingAlert) {
      existingAlert.is_resolved = true;
      existingAlert.resolved_at = new Date();
      await stockAlertRepository.save(existingAlert);
    }
  }

  // ─────────────────────────────────────────────
  // 📦 CREAR ORDER
  // ─────────────────────────────────────────────
  private normalizeOrderType(value?: string): OrderType {
    const normalized = String(value ?? '').trim().toLowerCase();

    switch (normalized) {
      case OrderType.SCHEDULED:
      case 'scheduled':
      case 'programado':
      case 'programed':
        return OrderType.SCHEDULED;
      case OrderType.DELIVERY:
      case 'delivery':
      case 'domicilio':
      case 'local':
      case 'takeaway':
      case 'llevar':
      case 'para llevar':
        return OrderType.DELIVERY;
      default:
        return OrderType.DELIVERY;
    }
  }

  async create(createOrderDto: CreateOrderDto) {
    const queryRunner =
      this.productRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        client: clientData,
        clientId,
        customerId,
        userId,
        user_id,
        type: incomingType,
        orderType,
        order_type,
        deliveryAddress,
        delivery_address,
        scheduledAt,
        scheduled_at,
        status: incomingStatus,
        programed,
        programado,
        delivery_date: incomingDeliveryDate,
        details,
        ...orderData
      } = createOrderDto;

      const resolvedUserId = userId ?? user_id;
      const normalizedType = this.normalizeOrderType(
        incomingType ?? orderType ?? order_type,
      );
      const normalizedStatus = incomingStatus ?? OrderStatus.PENDING;
      const normalizedProgramed =
        programed ?? programado ?? normalizedType === OrderType.SCHEDULED;
      const normalizedDeliveryDate =
        incomingDeliveryDate ??
        (normalizedType === OrderType.SCHEDULED
          ? scheduledAt ?? scheduled_at ?? null
          : null);
      const normalizedAddress = deliveryAddress ?? delivery_address ?? null;

      let client: Client | null = null;
      const clientInput = clientData ?? (clientId ?? customerId ? { id: clientId ?? customerId } : null);
      if (clientInput) {
        const requestedId = clientInput.id?.trim();
        const requestedName = clientInput.full_name?.trim();
        const requestedPhone = clientInput.phone?.trim();
        const requestedDirection = clientInput.direction?.trim();

        const hasName = Boolean(requestedName);
        const hasPhone = Boolean(requestedPhone);
        const hasDirection = Boolean(requestedDirection);

        if (requestedId) {
          client = await queryRunner.manager.findOne(Client, {
            where: { id: requestedId },
          });
        }

        if (!client && hasPhone) {
          client = await queryRunner.manager.findOne(Client, {
            where: { phone: requestedPhone },
          });
        }

        if (!client && hasName && hasDirection) {
          client = await queryRunner.manager.findOne(Client, {
            where: { full_name: requestedName, direction: requestedDirection },
          });
        }

        if (!client && (hasName || hasPhone || hasDirection)) {
          const newClient = queryRunner.manager.create(Client, {
            full_name: requestedName,
            phone: requestedPhone,
            direction: requestedDirection,
          });
          client = await queryRunner.manager.save(Client, newClient);
        } else if (client && (hasName || hasPhone || hasDirection)) {
          if (hasName && client.full_name !== requestedName) {
            client.full_name = requestedName;
          }
          if (hasPhone && client.phone !== requestedPhone) {
            client.phone = requestedPhone;
          }
          if (hasDirection && client.direction !== requestedDirection) {
            client.direction = requestedDirection;
          }
          client = await queryRunner.manager.save(Client, client);
        }
      }

      // USER
      const user = await queryRunner.manager.findOne(User, {
        where: { id: resolvedUserId, isActive: true },
      });
      if (!user)
        throw new NotFoundException(`User with id ${resolvedUserId} not found`);

      let total = 0;
      const orderDetails: OrdersDetail[] = [];

      // DETAILS
      for (const item of details) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId, isActive: true },
          relations: { promotion: true }, // cargar promoción
        });

        if (!product)
          throw new NotFoundException(
            `Product with id ${item.productId} not found`,
          );

        await this.reserveStock(product, item.quantity, queryRunner.manager);

        // Aplicar promoción si existe
        const { finalPrice, discountApplied, subtotal } = this.applyPromotion(
          Number(product.price),
          item.quantity,
          product.promotion,
        );

        total += subtotal;

        const toppingIds = Array.isArray(item.toppingIds)
          ? item.toppingIds
          : Array.isArray((item as any).toppings)
            ? (item as any).toppings
            : [];

        const toppings = toppingIds.length > 0
          ? await queryRunner.manager.find(Topping, {
              where: { id: In(toppingIds), isActive: true },
            })
          : [];

        const detail = queryRunner.manager.create(OrdersDetail, {
          product,
          quantity: item.quantity,
          priceUnique: product.price,
          discountApplied,
          finalPrice,
          subtotal,
          toppings: toppings.map((t) => ({ id: t.id, name: t.name })),
        });

        orderDetails.push(detail);

        await this.syncStockAlert(product, queryRunner.manager);
      }

      // ORDER
      const order = queryRunner.manager.create(Order, {
        ...orderData,
        client,
        user,
        total,
        type: normalizedType,
        status: normalizedStatus,
        programed: normalizedProgramed,
        delivery_address: normalizedAddress ?? undefined,
        scheduled_at: normalizedDeliveryDate
          ? new Date(normalizedDeliveryDate)
          : undefined,
        delivery_date: normalizedDeliveryDate
          ? new Date(normalizedDeliveryDate)
          : undefined,
        notes: orderData.notes ?? undefined,
        details: orderDetails,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─────────────────────────────────────────────
  // 📋 LISTAR ORDERS
  // ─────────────────────────────────────────────
  async findAll() {
    const orders = await this.orderRepository.find({
      relations: { client: true, user: true, details: { product: true } },
    });

    return orders.map((order) => ({
      id: order.id,
      type: order.type,
      order_type: order.type,
      orderType: order.type,
      status: order.status,
      customerId: order.client?.id ?? null,
      customerName: order.client?.full_name ?? 'Cliente general',
      customerPhone: order.client?.phone ?? null,
      delivery_address: order.delivery_address ?? order.client?.direction ?? null,
      deliveryAddress: order.delivery_address ?? order.client?.direction ?? null,
      scheduled_at: order.scheduled_at ? order.scheduled_at.toISOString() : null,
      scheduledAt: order.scheduled_at ? order.scheduled_at.toISOString() : null,
      ...(order.programed && { delivery_date: order.delivery_date }),
      notes: order.notes ?? null,
      client: {
        id: order.client?.id ?? null,
        fullName: order.client?.full_name ?? 'Cliente general',
        phone: order.client?.phone ?? '',
        ...(order.type === 'delivery' && { address: order.client?.direction ?? '' }),
      },
      user: { id: order.user.id, fullName: order.user.name },
      total: order.total,
      details: order.details.map((detail) => ({
        product: { id: detail.product.id, name: detail.product.name },
        quantity: detail.quantity,
        priceUnique: detail.priceUnique,
        discountApplied: detail.discountApplied,
        finalPrice: detail.finalPrice,
        subtotal: detail.subtotal,
        toppings: detail.toppings ?? [],
      })),
      createdAt: order.createdAt,
    }));
  }

  // ─────────────────────────────────────────────
  // 🔍 BUSCAR ORDER POR ID
  // ─────────────────────────────────────────────
  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { client: true, user: true, details: { product: true } },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Pedido cancelado`);
    }

    return {
      id: order.id,
      type: order.type,
      order_type: order.type,
      orderType: order.type,
      status: order.status,
      customerId: order.client?.id ?? null,
      customerName: order.client?.full_name ?? 'Cliente general',
      customerPhone: order.client?.phone ?? null,
      delivery_address: order.delivery_address ?? order.client?.direction ?? null,
      deliveryAddress: order.delivery_address ?? order.client?.direction ?? null,
      scheduled_at: order.scheduled_at ? order.scheduled_at.toISOString() : null,
      scheduledAt: order.scheduled_at ? order.scheduled_at.toISOString() : null,
      ...(order.programed && { delivery_date: order.delivery_date }),
      notes: order.notes ?? null,
      client: {
        id: order.client?.id ?? null,
        fullName: order.client?.full_name ?? 'Cliente general',
        phone: order.client?.phone ?? '',
        ...(order.type === 'delivery' && { address: order.client?.direction ?? '' }),
      },
      user: { id: order.user.id, fullName: order.user.name },
      total: order.total,
      details: order.details.map((detail) => ({
        product: { id: detail.product.id, name: detail.product.name },
        quantity: detail.quantity,
        priceUnique: detail.priceUnique,
        discountApplied: detail.discountApplied,
        finalPrice: detail.finalPrice,
        subtotal: detail.subtotal,
        toppings: detail.toppings ?? [],
      })),
      createdAt: order.createdAt,
    };
  }

  // ─────────────────────────────────────────────
  // ✏️ ACTUALIZAR ORDER
  // ─────────────────────────────────────────────
  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { client: true, user: true, details: { product: true } },
    });

    if (!order) throw new NotFoundException(`Order with id ${id} not found`);
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException('This order cannot be modified');
    }

    // CLIENTE
    if (updateOrderDto.client) {
      const requestedId = updateOrderDto.client.id?.trim();
      const requestedName = updateOrderDto.client.full_name?.trim();
      const requestedPhone = updateOrderDto.client.phone?.trim();
      const requestedDirection = updateOrderDto.client.direction?.trim();

      const hasName = requestedName !== undefined && requestedName !== "";
      const hasPhone = requestedPhone !== undefined && requestedPhone !== "";
      const hasDirection = requestedDirection !== undefined && requestedDirection !== "";

      if (hasPhone) {
        const existingPhoneClient = await this.clientRepository.findOne({
          where: { phone: requestedPhone },
        });
        if (
          existingPhoneClient &&
          existingPhoneClient.id !== order.client?.id &&
          existingPhoneClient.id !== requestedId
        ) {
          throw new BadRequestException('Teléfono ya registrado');
        }
      }

      let targetClient: Client | null = order.client;
      if (requestedId) {
        const clientById = await this.clientRepository.findOne({
          where: { id: requestedId },
        });
        if (!clientById) {
          throw new NotFoundException(`Cliente con id ${requestedId} no encontrado`);
        }
        targetClient = clientById;
      }

      if (!targetClient) {
        targetClient = this.clientRepository.create({
          full_name: hasName ? requestedName : undefined,
          phone: hasPhone ? requestedPhone : undefined,
          direction: hasDirection ? requestedDirection : undefined,
        });
        targetClient = await this.clientRepository.save(targetClient);
      } else {
        let changed = false;
        if (hasName && targetClient.full_name !== requestedName) {
          targetClient.full_name = requestedName;
          changed = true;
        }
        if (hasPhone && targetClient.phone !== requestedPhone) {
          targetClient.phone = requestedPhone;
          changed = true;
        }
        if (hasDirection && targetClient.direction !== requestedDirection) {
          targetClient.direction = requestedDirection;
          changed = true;
        }
        if (changed) {
          targetClient = await this.clientRepository.save(targetClient);
        }
      }

      order.client = targetClient;
    }

    // CAMPOS ORDER
    if (updateOrderDto.type) order.type = updateOrderDto.type;
    if (updateOrderDto.programed !== undefined)
      order.programed = updateOrderDto.programed;
    if (updateOrderDto.delivery_date !== undefined)
      order.delivery_date = updateOrderDto.delivery_date;
    if (updateOrderDto.delivery_address !== undefined)
      order.delivery_address = updateOrderDto.delivery_address;
    if (updateOrderDto.scheduled_at !== undefined)
      order.scheduled_at = updateOrderDto.scheduled_at ? new Date(updateOrderDto.scheduled_at) : undefined;
    if (updateOrderDto.notes !== undefined)
      order.notes = updateOrderDto.notes;
    if (updateOrderDto.status) order.status = updateOrderDto.status;

    const shouldCreateSale =
      order.status === OrderStatus.DELIVERED &&
      (updateOrderDto.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.DELIVERED);

    if (shouldCreateSale) {
      const existingSale = await this.saleRepository.findOne({
        where: { order: { id: order.id } },
      });
      if (!existingSale) {
        throw new BadRequestException('La venta debe crearse a través de la ruta de ventas');
      }
      order.sale = existingSale;
    }

    // DETAILS (RECALCULO COMPLETO)
    if (updateOrderDto.details) {
      // Devolver stock anterior
      for (const detail of order.details) {
        if (!detail.product) continue;
        const product = await this.productRepository.findOne({
          where: { id: detail.product.id },
        });
        if (product) {
          product.current_stock += detail.quantity;
          await this.productRepository.save(product);
          await this.syncStockAlert(product);
        }
      }

      // Eliminar detalles viejos
      await this.ordersDetailRepository.remove(order.details);

      let total = 0;
      const newDetails: OrdersDetail[] = [];

      for (const item of updateOrderDto.details) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId, isActive: true },
          relations: { promotion: true }, // cargar promoción
        });

        if (!product)
          throw new NotFoundException(
            `Product with id ${item.productId} not found`,
          );
        await this.reserveStock(product, item.quantity, this.productRepository.manager);

        // Aplicar promoción si existe
        const { finalPrice, discountApplied, subtotal } = this.applyPromotion(
          Number(product.price),
          item.quantity,
          product.promotion,
        );

        total += subtotal;

        const toppings = Array.isArray(item.toppingIds) && item.toppingIds.length > 0
          ? await this.toppingRepository.find({
              where: { id: In(item.toppingIds), isActive: true },
            })
          : [];

        const detail = this.ordersDetailRepository.create({
          product,
          quantity: item.quantity,
          priceUnique: product.price,
          discountApplied,
          finalPrice,
          subtotal,
          toppings: toppings.map((t) => ({ id: t.id, name: t.name })),
        });

        newDetails.push(detail);

        product.current_stock -= item.quantity;
        await this.productRepository.save(product);
        await this.syncStockAlert(product);
      }

      order.details = newDetails;
      order.total = total;
    }

    return await this.orderRepository.save(order);
  }

  // ─────────────────────────────────────────────
  // ❌ CANCELAR ORDER
  // ─────────────────────────────────────────────
  async remove(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { details: { product: true } },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('El pedido ya está cancelado');
    }

    // Restaurar stock
    for (const detail of order.details) {
      detail.product.current_stock += detail.quantity;
      await this.productRepository.save(detail.product);
      await this.syncStockAlert(detail.product);
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return { message: 'Pedido cancelado correctamente' };
  }
}
