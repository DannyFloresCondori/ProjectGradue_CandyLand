import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { ensureNameIsAvailable, saveWithUniqueNameConstraint } from 'src/common/normalized-name';

const DUPLICATE_CATEGORY_MESSAGE = 'Esta categoría ya está registrada';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  async create(createCategoryDto: CreateCategoryDto) {
    const name = createCategoryDto.name.trim();
    await ensureNameIsAvailable(this.categoryRepository, name, DUPLICATE_CATEGORY_MESSAGE);
    const category = await this.categoryRepository.create({ ...createCategoryDto, name });
    await saveWithUniqueNameConstraint(this.categoryRepository, category, DUPLICATE_CATEGORY_MESSAGE);
    return category;
  }

  async findAll() {
    return await this.categoryRepository.find({
      where: {
        isActive: true,
      },
    });
  }

  async findAllIncludingInactive() {
    return this.categoryRepository.find();
  }

  async reactivate(id: string) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    if (!category.isActive) {
      category.isActive = true;
      await this.categoryRepository.save(category);
    }

    return category;
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

    const name = updateCategoryDto.name?.trim();
    if (name !== undefined) {
      await ensureNameIsAvailable(this.categoryRepository, name, DUPLICATE_CATEGORY_MESSAGE, id);
    }

    const category = await this.categoryRepository.preload({
      id,
      ...updateCategoryDto,
      ...(name !== undefined ? { name } : {}),
    });
    if (!category) {
      throw new NotFoundException('Categoria no encontrada');
    }
    await saveWithUniqueNameConstraint(this.categoryRepository, category, DUPLICATE_CATEGORY_MESSAGE);
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
