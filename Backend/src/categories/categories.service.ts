import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  async create(createCategoryDto: CreateCategoryDto) {
    const existingCategory = await this.categoryRepository.findOneBy({
      name: createCategoryDto.name,
    });
    if (existingCategory) {
      throw new BadRequestException('La categoria ya esta registrada');
    }
    const category = await this.categoryRepository.create(createCategoryDto);
    await this.categoryRepository.save(category);
    return category;
  }

  async findAll() {
    return await this.categoryRepository.find({
      where: {
        isActive: true,
      },
    });
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!category) {
      throw new NotFoundException('Categoria no encontrada o inactiva');
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const existingCategory = await this.categoryRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!existingCategory) {
      throw new NotFoundException('Categoria no encontrada O inactiva');
    }

    const category = await this.categoryRepository.preload({
      id,
      ...updateCategoryDto,
    });
    if (!category) {
      throw new NotFoundException('Categoria no encontrada');
    }
    await this.categoryRepository.save(category);
    return category;
  }

  async remove(id: string) {
    const category = await this.categoryRepository.findOneBy({ id });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Eliminar categoría
    await this.categoryRepository.update(id, { isActive: false});

    return {
      message: 'Categoría desactivada correctamente',
    };
  }
}
