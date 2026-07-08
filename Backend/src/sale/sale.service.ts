import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import path from 'path';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from 'src/products/entities/product.entity';
import { EntityManager, In, Repository } from 'typeorm';
import { StockAlert } from 'src/stock_alert/entities/stock_alert.entity';
import { Payment_method, Sale, SalesStatus } from './entities/sale.entity';
import { Client } from 'src/client/entities/client.entity';
import { User } from 'src/users/entities/user.entity';
import { SaleDetail } from 'src/sale_detail/entities/sale_detail.entity';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { Topping } from 'src/topping/entities/topping.entity';
import {
  Promotion,
  PromotionType,
} from 'src/promotions/entities/promotion.entity';
import { generateTicketPdf } from 'src/pdf/ticket.pdf';

@Injectable()
export class SaleService {
  private readonly logger = new Logger(SaleService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(SaleDetail)
    private readonly saleDetailRepository: Repository<SaleDetail>,
    @InjectRepository(StockAlert)
    private readonly stockAlertRepository: Repository<StockAlert>,
    @InjectRepository(Topping)
    private readonly toppingRepository: Repository<Topping>,
  ) {}

  private serializeSale(sale: Sale) {
    return {
      id: sale.id,
      type: sale.type,
      status: sale.status,
      payment_method: sale.payment_method,
      total: sale.total,
      ...(sale.status === SalesStatus.CANCELED && { reason: sale.reason }),
      ...(sale.order && {
        order: {
          id: sale.order.id,
          status: sale.order.status,
          type: sale.order.type,
        },
      }),
      client: {
        id: sale.client?.id ?? '',
        fullName: sale.client?.full_name ?? 'Cliente general',
        phone: sale.client?.phone ?? '',
        address: sale.client?.direction ?? '',
      },
      user: { id: sale.user.id, username: sale.user.name },
      details: sale.saleDetail.map((detail) => ({
        product: {
          id: detail.product.id,
          name: detail.product.name,
          price: detail.product.price,
        },
        quantity: detail.quantity,
        priceUnique: detail.priceUnique,
        discountApplied: detail.discountApplied,
        finalPrice: detail.finalPrice,
        subtotal: detail.subtotal,
        toppings: detail.toppings ?? [],
      })),
      createdAt: sale.createdAt,
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

  private async restoreStock(product: Product, quantity: number, manager: EntityManager) {
    await manager.query('UPDATE products SET current_stock = current_stock + $1 WHERE id = $2', [quantity, product.id]);
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

  private async createTicketPayload(sale: Sale) {
    const pdfBuffer = await generateTicketPdf(sale);
    const ticketDir = path.join(process.cwd(), 'uploads', 'tickets');
    await fs.mkdir(ticketDir, { recursive: true });

    const fileName = `ticket-${sale.id}.pdf`;
    const filePath = path.join(ticketDir, fileName);
    await fs.writeFile(filePath, pdfBuffer);

    return {
      ticketPdf: pdfBuffer.toString('base64'),
      ticketFileName: fileName,
      ticketUrl: `/api/v1/sale/${sale.id}/ticket`,
    };
  }

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

  // ─────────────────────────────────────────────
  // 💰 CREAR VENTA
  // ─────────────────────────────────────────────
  async create(createSaleDto: CreateSaleDto & { orderId?: string }) {
    const queryRunner = this.saleRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        client: clientData,
        clientId,
        userId,
        details,
        orderId,
        payment_method,
        paymentType,
      } = createSaleDto;

      const resolvedPaymentMethod = payment_method ?? (paymentType === 'cash' || paymentType === Payment_method.IN_EFECTIVE
        ? Payment_method.IN_EFECTIVE
        : paymentType === 'qr' || paymentType === Payment_method.IN_QR
          ? Payment_method.IN_QR
          : Payment_method.IN_EFECTIVE);

      let total = 0;
      const saleDetails: SaleDetail[] = [];
      let order: Order | null = null;
      let client;
      let user;

      if (orderId) {
        order = await queryRunner.manager.findOne(Order, {
          where: { id: orderId },
          relations: { details: { product: true }, client: true, user: true },
        });

        if (!order) throw new NotFoundException('Order not found');

        const existingSale = await queryRunner.manager.findOne(Sale, {
          where: { order: { id: order.id } },
        });
        if (existingSale) {
          throw new BadRequestException('Este pedido ya tiene una venta asociada');
        }

        client = order.client;
        user = order.user;

        for (const detail of order.details) {
          const unitPrice = Number(detail.priceUnique ?? 0);
          const finalPrice = Number(detail.finalPrice ?? unitPrice);
          const discountApplied = Number(detail.discountApplied ?? 0);
          const subtotal = Number(detail.subtotal ?? finalPrice * detail.quantity);
          total += subtotal;
          saleDetails.push(
            queryRunner.manager.create(SaleDetail, {
              product: detail.product,
              quantity: detail.quantity,
              priceUnique: unitPrice,
              discountApplied,
              finalPrice,
              subtotal,
              toppings: detail.toppings ?? [],
            }),
          );
        }
      } else {
        if (!userId || !details) {
          throw new BadRequestException('userId and details are required for a direct sale');
        }

        if (clientId) {
          client = await queryRunner.manager.findOne(Client, { where: { id: clientId } });
        }

        if (clientData) {
          if (clientData.id) {
            client = await queryRunner.manager.findOne(Client, { where: { id: clientData.id } });
          }
          if (!client && clientData.phone) {
            client = await queryRunner.manager.findOne(Client, { where: { phone: clientData.phone } });
          }
          if (!client && clientData.full_name) {
            client = await queryRunner.manager.findOne(Client, { where: { full_name: clientData.full_name } });
          }
          if (!client && (clientData.full_name || clientData.phone || clientData.direction)) {
            const newClient = queryRunner.manager.create(Client, {
              full_name: clientData.full_name,
              phone: clientData.phone,
              direction: clientData.direction,
            });
            client = await queryRunner.manager.save(Client, newClient);
          }
        }

        user = await queryRunner.manager.findOne(User, { where: { id: userId, isActive: true } });
        if (!user) throw new NotFoundException(`User with id ${userId} not found`);

        for (const item of details) {
          const product = await queryRunner.manager.findOne(Product, {
            where: { id: item.productId, isActive: true },
            relations: { promotion: true },
          });

          if (!product) throw new NotFoundException('Product not found');

          await this.reserveStock(product, item.quantity, queryRunner.manager);

          const { finalPrice, discountApplied, subtotal } = this.applyPromotion(
            Number(product.price),
            item.quantity,
            product.promotion,
          );

          total += subtotal;
          const toppings = Array.isArray(item.toppingIds) && item.toppingIds.length > 0
            ? await queryRunner.manager.find(Topping, {
                where: { id: In(item.toppingIds), isActive: true },
              })
            : [];

          saleDetails.push(
            queryRunner.manager.create(SaleDetail, {
              product,
              quantity: item.quantity,
              priceUnique: product.price,
              finalPrice,
              discountApplied,
              subtotal,
              toppings: toppings.map((t) => ({ id: t.id, name: t.name })),
            }),
          );

          await this.syncStockAlert(product, queryRunner.manager);
        }
      }

      const sale = queryRunner.manager.create(Sale, {
        client,
        user,
        total,
        payment_method: resolvedPaymentMethod,
        order: order ?? undefined,
        saleDetail: saleDetails,
        status: SalesStatus.DELIVERED,
      });
      const savedSale = await queryRunner.manager.save(Sale, sale);

      const saleWithRelations = await queryRunner.manager.findOne(Sale, {
        where: { id: savedSale.id },
        relations: {
          client: true,
          user: { role: true },
          order: true,
          saleDetail: { product: { promotion: true } },
        },
      });

      if (!saleWithRelations) throw new NotFoundException(`Sale with id ${savedSale.id} not found`);

      if (order) {
        order.status = OrderStatus.DELIVERED;
        await queryRunner.manager.save(Order, order);
      }

      await queryRunner.commitTransaction();

      let ticket: {
        ticketPdf: string;
        ticketFileName: string;
        ticketUrl: string;
      } | null = null;
      try {
        ticket = await this.createTicketPayload(saleWithRelations);
      } catch (error) {
        this.logger.warn(`No se pudo generar el ticket para la venta ${saleWithRelations.id}`, error);
      }

      return {
        ...this.serializeSale(saleWithRelations),
        ticket,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─────────────────────────────────────────────
  // 📋 LISTAR VENTAS
  // ─────────────────────────────────────────────
  async findAll() {
    const sales = await this.saleRepository.find({
      relations: {
        client: true,
        user: { role: true },
        order: true,
        saleDetail: { product: { promotion: true } },
      },
    });

    return sales.map((sale) => ({
      id: sale.id,
      type: sale.type,
      status: sale.status,
      payment_method: sale.payment_method,
      total: sale.total,
      ...(sale.status === SalesStatus.CANCELED && { reason: sale.reason }),
      ...(sale.order && {
        order: {
          id: sale.order.id,
          status: sale.order.status,
          type: sale.order.type,
        },
      }),
      client: {
        id: sale.client?.id ?? '',
        fullName: sale.client?.full_name ?? 'Cliente general',
        phone: sale.client?.phone ?? '',
        address: sale.client?.direction ?? '',
      },
      user: { id: sale.user.id, username: sale.user.name, roleName: sale.user?.role?.name ?? null },
      details: sale.saleDetail.map((detail) => ({
        product: {
          id: detail.product.id,
          name: detail.product.name,
          price: detail.product.price,
        },
        quantity: detail.quantity,
        priceUnique: detail.priceUnique,
        discountApplied: detail.discountApplied,
        finalPrice: detail.finalPrice,
        subtotal: detail.subtotal,
        promotionName: detail.product?.promotion?.name ?? null,
        toppings: detail.toppings ?? [],
      })),
      createdAt: sale.createdAt,
    }));
  }

  // ─────────────────────────────────────────────
  // 🔍 BUSCAR VENTA POR ID
  // ─────────────────────────────────────────────
  async findOne(id: string) {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: {
        client: true,
        user: { role: true },
        order: true,
        saleDetail: { product: { promotion: true } },
      },
    });

    if (!sale) throw new NotFoundException(`Sale with id ${id} not found`);

    return {
      id: sale.id,
      type: sale.type,
      status: sale.status,
      payment_method: sale.payment_method,
      total: sale.total,
      ...(sale.status === SalesStatus.CANCELED && { reason: sale.reason }),
      ...(sale.order && {
        order: {
          id: sale.order.id,
          status: sale.order.status,
          type: sale.order.type,
        },
      }),
      client: {
        id: sale.client?.id ?? '',
        fullName: sale.client?.full_name ?? 'Cliente general',
        phone: sale.client?.phone ?? '',
        address: sale.client?.direction ?? '',
      },
      user: { id: sale.user.id, username: sale.user.name, roleName: sale.user?.role?.name ?? null },
      details: sale.saleDetail.map((detail) => ({
        product: {
          id: detail.product.id,
          name: detail.product.name,
          price: detail.product.price,
        },
        quantity: detail.quantity,
        priceUnique: detail.priceUnique,
        discountApplied: detail.discountApplied,
        finalPrice: detail.finalPrice,
        subtotal: detail.subtotal,
        promotionName: detail.product?.promotion?.name ?? null,
        toppings: detail.toppings ?? [],
      })),
      createdAt: sale.createdAt,
    };
  }

  update(id: string, updateSaleDto: UpdateSaleDto) {
    return `This action updates a #${id} sale`;
  }

  // ─────────────────────────────────────────────
  // ❌ CANCELAR VENTA
  // ─────────────────────────────────────────────
  async remove(id: string, reason: string) {
    const queryRunner = this.saleRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sale = await queryRunner.manager.findOne(Sale, {
        where: { id },
        relations: { saleDetail: { product: true } },
      });

      if (!sale) throw new NotFoundException(`Sale with id ${id} not found`);
      if (sale.status === SalesStatus.CANCELED) {
        throw new BadRequestException('La venta ya está cancelada');
      }
      if (!reason?.trim()) {
        throw new BadRequestException('La razón de cancelación es obligatoria');
      }

      for (const detail of sale.saleDetail) {
        await this.restoreStock(detail.product, detail.quantity, queryRunner.manager);
        detail.product.current_stock += detail.quantity;
        await queryRunner.manager.save(Product, detail.product);
        await this.syncStockAlert(detail.product, queryRunner.manager);
      }

      sale.status = SalesStatus.CANCELED;
      sale.reason = reason.trim();
      await queryRunner.manager.save(Sale, sale);
      await queryRunner.commitTransaction();

      return { message: 'Venta cancelada correctamente' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async generateTicket(id: string): Promise<Buffer> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: { client: true, user: true, saleDetail: { product: { promotion: true } } },
    });

    if (!sale) throw new NotFoundException(`Sale with id ${id} not found`);

    return generateTicketPdf(sale); // 👈 delega al generador
  }
}
