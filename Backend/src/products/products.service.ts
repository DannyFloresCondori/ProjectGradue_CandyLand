import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';
import { ProductTopping } from 'src/product_topping/entities/product_topping.entity';
import { Topping } from 'src/topping/entities/topping.entity';
import { StockAlert } from 'src/stock_alert/entities/stock_alert.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductTopping)
    private readonly productToppingRepository: Repository<ProductTopping>,
    @InjectRepository(Topping)
    private readonly toppingRepository: Repository<Topping>,
    @InjectRepository(StockAlert)
    private readonly stockAlertRepository: Repository<StockAlert>,
  ) {}

  private normalizeProductName(name: string) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private areProductNamesSimilar(firstName: string, secondName: string) {
    const first = this.normalizeProductName(firstName);
    const second = this.normalizeProductName(secondName);
    if (first === second) return true;
    if (Math.min(first.length, second.length) < 4) return false;
    if (first.includes(second) || second.includes(first)) return true;

    const distances = Array.from({ length: second.length + 1 }, (_, index) => index);
    for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
      let diagonal = distances[0];
      distances[0] = firstIndex;

      for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
        const previousRow = distances[secondIndex];
        distances[secondIndex] = Math.min(
          distances[secondIndex] + 1,
          distances[secondIndex - 1] + 1,
          diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
        );
        diagonal = previousRow;
      }
    }

    return distances[second.length] <= Math.max(1, Math.floor(Math.max(first.length, second.length) * 0.2));
  }

  private async ensureProductNameIsAvailable(name: string, excludeId?: string) {
    const products = await this.productRepository.find({
      select: { id: true, name: true },
    });
    const duplicate = products.some((product) =>
      product.id !== excludeId && this.areProductNamesSimilar(product.name, name),
    );

    if (duplicate) {
      throw new ConflictException('Ya existe un producto con ese nombre');
    }
  }

  private async saveProductWithNameConstraint(product: Product) {
    try {
      return await this.productRepository.save(product);
    } catch (error) {
      const databaseError = error as { code?: string; driverError?: { code?: string } };
      if (databaseError.code === '23505' || databaseError.driverError?.code === '23505') {
        throw new ConflictException('Ya existe un producto con ese nombre');
      }
      throw error;
    }
  }

  private async syncStockAlert(product: Product) {
    const message = `${product.name} llego al minimo de stock`;
    const existingAlert = await this.stockAlertRepository.findOne({
      where: { product: { id: product.id }, is_resolved: false },
      relations: { product: true },
      order: { alerted_at: 'DESC' },
    });

    if (product.current_stock <= product.minimum_stock) {
      if (!existingAlert) {
        const alert = this.stockAlertRepository.create({
          product,
          current_stock: product.current_stock,
          minimum_stock: product.minimum_stock,
          is_resolved: false,
          alert_message: message,
        });
        await this.stockAlertRepository.save(alert);
      }
      return;
    }

    if (existingAlert) {
      existingAlert.is_resolved = true;
      existingAlert.resolved_at = new Date();
      await this.stockAlertRepository.save(existingAlert);
    }
  }

  private async syncProductToppings(product: Product, toppingIds: string[] = []) {
    const requestedIds = Array.from(new Set((toppingIds ?? []).filter(Boolean)));

    const currentRelations = await this.productToppingRepository.find({
      where: { product: { id: product.id } },
      relations: { topping: true },
    });

    const currentIds = new Set(currentRelations.map((item) => item.topping?.id).filter(Boolean));

    for (const relation of currentRelations) {
      if (!requestedIds.includes(relation.topping?.id)) {
        await this.productToppingRepository.remove(relation);
      }
    }

    for (const toppingId of requestedIds) {
      if (currentIds.has(toppingId)) {
        continue;
      }

      const topping = await this.toppingRepository.findOneBy({
        id: toppingId,
        isActive: true,
      });

      if (!topping) {
        throw new NotFoundException(`Topping con id ${toppingId} no encontrado o inactivo`);
      }

      const productTopping = this.productToppingRepository.create({
        product,
        topping,
      });

      await this.productToppingRepository.save(productTopping);
    }
  }

  async create(createProductDto: CreateProductDto) {
    const { categoryId, toppingId, ...productData } = createProductDto;
    const normalizedName = createProductDto.name.trim();
    await this.ensureProductNameIsAvailable(normalizedName);

    const category = await this.categoryRepository.findOneBy({
      id: categoryId,
      isActive: true,
    });

    if (!category) {
      throw new BadRequestException('Categoria no valida o inactiva');
    }

    // Crear producto
    const product = this.productRepository.create({
      ...productData,
      name: normalizedName,
      category,
    });

    const savedProduct = await this.saveProductWithNameConstraint(product);
    await this.syncStockAlert(savedProduct);

    await this.syncProductToppings(savedProduct, toppingId ?? []);

    return await this.productRepository.findOne({
      where: {
        id: savedProduct.id,
      },
      relations: {
        category: true,
        productToppings: {
          topping: true,
        },
      },
    });
  }

  async findAll() {
    const products = await this.productRepository.find({
      where: { isActive: true },
      relations: ['category', 'productToppings', 'productToppings.topping'],
    });

    return products.map((product) => ({
      ...product,
      toppings: (product.productToppings ?? []).map((productTopping) => ({
        id: productTopping.topping?.id,
        name: productTopping.topping?.name,
        price: (productTopping.topping as any)?.price ?? 0,
        isActive: productTopping.topping?.isActive,
      })),
    }));
  }

  async findAllIncludingInactive() {
    const products = await this.productRepository.find({
      relations: ['category', 'productToppings', 'productToppings.topping'],
    });

    return products.map((product) => ({
      ...product,
      toppings: (product.productToppings ?? []).map((productTopping) => ({
        id: productTopping.topping?.id,
        name: productTopping.topping?.name,
        price: (productTopping.topping as any)?.price ?? 0,
        isActive: productTopping.topping?.isActive,
      })),
    }));
  }

  async reactivate(id: string, createProductDto: CreateProductDto) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) throw new NotFoundException('Producto no encontrado');

    if (!product.isActive) {
      const normalizedName = createProductDto.name.trim();
      await this.ensureProductNameIsAvailable(normalizedName, id);
      const { categoryId, toppingId } = createProductDto;
      const category = await this.categoryRepository.findOneBy({
        id: categoryId,
        isActive: true,
      });
      if (!category) {
        throw new BadRequestException('Categoria no valida o inactiva');
      }

      product.name = normalizedName;
      product.description = createProductDto.description ?? product.description;
      product.price = createProductDto.price;
      product.current_stock = createProductDto.current_stock;
      product.minimum_stock = createProductDto.minimum_stock;
      product.category = category;
      product.isActive = true;
      await this.saveProductWithNameConstraint(product);
      await this.syncProductToppings(product, toppingId ?? []);
      await this.syncStockAlert(product);
    }

    return this.findOne(id);
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id, isActive: true },
      relations: ['category', 'productToppings', 'productToppings.topping'],
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado o inactivo');
    }

    return {
      ...product,
      toppings: (product.productToppings ?? []).map((productTopping) => ({
        id: productTopping.topping?.id,
        name: productTopping.topping?.name,
        price: (productTopping.topping as any)?.price ?? 0,
        isActive: productTopping.topping?.isActive,
      })),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const normalizedName = updateProductDto.name?.trim();
    const normalizedUpdate = normalizedName === undefined
      ? updateProductDto
      : { ...updateProductDto, name: normalizedName };
    const { toppingId, ...productData } = normalizedUpdate;
    const product = await this.productRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado o inactivo');
    }

    if (normalizedName !== undefined) {
      await this.ensureProductNameIsAvailable(normalizedName, id);
    }

    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOneBy({
        id: updateProductDto.categoryId,
        isActive: true,
      });
      if (!category) {
        throw new BadRequestException('Categoria no valida o inactiva');
      }
      product.category = category;
    }

    const updatedProduct = await this.productRepository.preload({
      id,
      ...productData,
    });
    if (!updatedProduct) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (updateProductDto.categoryId) {
      updatedProduct.category = product.category;
    }

    await this.saveProductWithNameConstraint(updatedProduct);
    if (toppingId !== undefined) {
      await this.syncProductToppings(updatedProduct, toppingId);
    }
    await this.syncStockAlert(updatedProduct);
    return this.productRepository.findOne({
      where: { id: updatedProduct.id },
      relations: { category: true, productToppings: { topping: true } },
    });
  }

  async remove(id: string) {
    const product = await this.productRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    await this.productRepository.update(id, {
      isActive: false,
    });
    return { message: `El producto ${product.name} ha sido desactivado` };
  }

  async uploadImage(id: string, file: any) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/jfif', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Formato de imagen no permitido. Usa PNG, JPG, JFIF, WEBP o GIF');
    }
    const maxImageSize = 5 * 1024 * 1024;
    if (file.size > maxImageSize) {
      throw new BadRequestException('La imagen no puede superar los 5 MB');
    }

    const product = await this.productRepository.findOneBy({ id, isActive: true });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const fileName = `product-${id}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'products');
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    product.image = `/uploads/products/${fileName}`;
    await this.productRepository.save(product);

    return { message: 'Imagen subida correctamente', image: product.image };
  }
}
