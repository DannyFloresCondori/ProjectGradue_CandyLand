import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Promotion, PromotionType } from './entities/promotion.entity';
import { In, Repository } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private validatePromotionDates(
    startValue: Date | string | null | undefined,
    endValue: Date | string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(endValue).toISOString().slice(0, 10);
    const startDate = startValue
      ? new Date(startValue).toISOString().slice(0, 10)
      : today;

    if (startDate < today) {
      throw new BadRequestException('Promotion start date must be today or later');
    }

    if (endDate < startDate) {
      throw new BadRequestException('Promotion end date must be on or after the start date');
    }

    const duration = Math.round(
      (new Date(`${endDate}T00:00:00Z`).getTime() -
        new Date(`${startDate}T00:00:00Z`).getTime()) /
        86400000,
    );

    if (duration > 6) {
      throw new BadRequestException('Promotion duration cannot exceed 7 days');
    }
  }

  private async syncPromotionStatus(promotion: Promotion): Promise<Promotion> {
    const now = new Date();
    const endDate = new Date(promotion.end_date);

    if (promotion.is_active && endDate <= now) {
      promotion.is_active = false;
      await this.promotionRepository.save(promotion);
    }

    return promotion;
  }

  async create(createPromotionDto: CreatePromotionDto) {
    this.validatePromotionDates(createPromotionDto.start_date, createPromotionDto.end_date);
    
    const { productIds, type, value, isActive, ...promotionData } =
      createPromotionDto;

    const existingPromotion = await this.promotionRepository.findOne({
      where: { name: promotionData.name },
    });

    if (existingPromotion) {
      throw new BadRequestException(
        `Promotion with name "${promotionData.name}" already exists`,
      );
    }

    const products = await this.productRepository.find({
      where: {
        id: In(productIds),
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more products do not exist',
      );
    }

    const newPromotion = this.promotionRepository.create({
      ...promotionData,
      type,
      value,
      is_active: isActive ?? true,
    });

    if (type === PromotionType.BUY_ONE_GET_ONE) {
      newPromotion.value = 50;
    }

    const savedPromotion =
      await this.promotionRepository.save(newPromotion);

    await this.syncPromotionStatus(savedPromotion);

    await this.productRepository.update(
      {
        id: In(productIds),
      },
      {
        promotion: savedPromotion,
      },
    );

    return await this.promotionRepository.findOne({
      where: {
        id: savedPromotion.id,
      },
      relations: {
        products: true,
      },
    });
  }

  async findAll() {
    const existsPromotions = await this.promotionRepository.find({ relations: { products: true } });

    if (existsPromotions.length === 0) {
      throw new NotFoundException(` no promotions found`);
    }

    for (const promotion of existsPromotions) {
      await this.syncPromotionStatus(promotion);
    }

    return existsPromotions;
  }

  async findOne(id: string) {
    const promotion = await this.promotionRepository.findOne({
      where: {
        id,
      },
      relations: {
        products: true,
      },
    });

    if (!promotion) {
      throw new NotFoundException(`promotion with id ${id} not found`);
    }

    await this.syncPromotionStatus(promotion);

    if (!promotion.products?.length) {
      return {
        ...promotion,
        message: 'This promotion has no associated products',
      };
    }
    return {
      ...promotion,
      products: promotion.products.map((product) => ({
        name: product.name,
        price: product.price,
      })),
    };
  }

async update(
  id: string,
  updatePromotionDto: UpdatePromotionDto,
) {
  const promotion = await this.promotionRepository.findOne({
    where: { id },
    relations: {
      products: true,
    },
  });

  if (!promotion) {
    throw new NotFoundException(
      `Promotion with id ${id} not found`,
    );
  }

  if (updatePromotionDto.start_date !== undefined || updatePromotionDto.end_date !== undefined) {
    this.validatePromotionDates(
      updatePromotionDto.start_date ?? promotion.start_date,
      updatePromotionDto.end_date ?? promotion.end_date,
    );
  }

  const { productIds, type, value, isActive, ...data } =
    updatePromotionDto;

  // Verificar nombre duplicado
  if (data.name && data.name !== promotion.name) {
    const existingPromotion =
      await this.promotionRepository.findOne({
        where: { name: data.name },
      });

    if (existingPromotion) {
      throw new BadRequestException(
        `Promotion with name "${data.name}" already exists`,
      );
    }
  }

  // Actualizar datos básicos
  Object.assign(promotion, data);

  if (isActive !== undefined) {
    promotion.is_active = isActive;
  }

  if (type) {
    promotion.type = type;

    if (type === PromotionType.BUY_ONE_GET_ONE) {
      promotion.value = 50;
    } else if (value !== undefined) {
      promotion.value = value;
    }
  }

  const savedPromotion =
    await this.promotionRepository.save(promotion);

  await this.syncPromotionStatus(savedPromotion);

  // Actualizar productos relacionados
  if (productIds) {
    // Quitar promoción de todos los productos actuales
    await this.productRepository.update(
      {
        promotion: {
          id: savedPromotion.id,
        },
      },
      {
        promotion: null,
      },
    );

    // Asignar promoción a los nuevos productos
    await this.productRepository.update(
      {
        id: In(productIds),
      },
      {
        promotion: savedPromotion,
      },
    );
  }

  return await this.promotionRepository.findOne({
    where: {
      id: savedPromotion.id,
    },
    relations: {
      products: true,
    },
  });
}

  async remove(id: string) {

    const existingPromotion = await this.promotionRepository.findOne({
      where: { id },
    })
    if (!existingPromotion) {
      throw new NotFoundException(`promotion with id ${id} not found`);
    }
    await this.promotionRepository.delete(id);
    return { message: `promotion with id ${id} has been removed`}

  }
}
