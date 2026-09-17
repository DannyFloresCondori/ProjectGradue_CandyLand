import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStockAlertDto } from './dto/create-stock_alert.dto';
import { UpdateStockAlertDto } from './dto/update-stock_alert.dto';
import { StockAlert } from './entities/stock_alert.entity';
import { Product } from 'src/products/entities/product.entity';

@Injectable()
export class StockAlertService {
  constructor(
    @InjectRepository(StockAlert)
    private readonly stockAlertRepository: Repository<StockAlert>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createStockAlertDto: CreateStockAlertDto) {
    const product = await this.productRepository.findOne({
      where: { id: createStockAlertDto.productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const existingAlert = await this.stockAlertRepository.findOne({
      where: { product: { id: product.id }, is_resolved: false },
      relations: { product: true },
      order: { alerted_at: 'DESC' },
    });

    if (existingAlert) {
      existingAlert.current_stock = product.current_stock;
      existingAlert.minimum_stock = product.minimum_stock;
      existingAlert.stock_quantity = createStockAlertDto.stock_quantity ?? existingAlert.stock_quantity;
      existingAlert.alert_message =
        createStockAlertDto.alert_message ?? 'llegaste al minimo de stock';
      return this.stockAlertRepository.save(existingAlert);
    }

    const newAlert = this.stockAlertRepository.create({
      product,
      current_stock: product.current_stock,
      minimum_stock: product.minimum_stock,
      stock_quantity: createStockAlertDto.stock_quantity ?? 0,
      is_resolved: false,
      alert_message: createStockAlertDto.alert_message ?? 'llegaste al minimo de stock',
    });

    return this.stockAlertRepository.save(newAlert);
  }

  async findAll() {
    return this.stockAlertRepository.find({
      relations: { product: true },
      order: { alerted_at: 'DESC' },
    });
  }

  async findActive() {
    return this.stockAlertRepository.find({
      where: { is_resolved: false },
      relations: { product: true },
      order: { alerted_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const alert = await this.stockAlertRepository.findOne({
      where: { id },
      relations: { product: true },
    });

    if (!alert) {
      throw new NotFoundException(`Alerta de stock ${id} no encontrada`);
    }

    return alert;
  }

  async update(id: string, updateStockAlertDto: UpdateStockAlertDto) {
    const alert = await this.stockAlertRepository.findOne({
      where: { id },
      relations: { product: true },
    });

    if (!alert) {
      throw new NotFoundException(`Alerta de stock ${id} no encontrada`);
    }

    if (updateStockAlertDto.productId) {
      const product = await this.productRepository.findOne({
        where: { id: updateStockAlertDto.productId, isActive: true },
      });

      if (!product) {
        throw new BadRequestException('Producto no encontrado');
      }

      alert.product = product;
    }

    if (updateStockAlertDto.current_stock !== undefined) {
      alert.current_stock = updateStockAlertDto.current_stock;
    }

    if (updateStockAlertDto.minimum_stock !== undefined) {
      alert.minimum_stock = updateStockAlertDto.minimum_stock;
    }

    if (updateStockAlertDto.stock_quantity !== undefined) {
      alert.stock_quantity = updateStockAlertDto.stock_quantity;
    }

    if (updateStockAlertDto.is_resolved !== undefined) {
      alert.is_resolved = updateStockAlertDto.is_resolved;
      if (updateStockAlertDto.is_resolved) {
        alert.resolved_at = updateStockAlertDto.resolved_at ?? new Date();
      } else {
        alert.resolved_at = null;
      }
    }

    if (updateStockAlertDto.alert_message !== undefined) {
      alert.alert_message = updateStockAlertDto.alert_message;
    }

    return this.stockAlertRepository.save(alert);
  }

  async remove(id: string) {
    const alert = await this.stockAlertRepository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`Alerta de stock ${id} no encontrada`);
    }

    await this.stockAlertRepository.remove(alert);
    return { message: 'Alerta eliminada' };
  }
}
