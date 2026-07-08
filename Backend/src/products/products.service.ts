import {
  BadRequestException,
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

    const category = await this.categoryRepository.findOneBy({
      id: categoryId,
      isActive: true,
    });

    if (!category) {
      throw new BadRequestException('Categoria no valida o inactiva');
    }

    const existingProduct = await this.productRepository.findOne({
      where: { name: createProductDto.name },
    });

    if (existingProduct?.isActive) {
      throw new BadRequestException('El producto ya existe');
    }

    if (existingProduct && !existingProduct.isActive) {
      existingProduct.isActive = true;
      existingProduct.description = createProductDto.description ?? existingProduct.description;
      existingProduct.price = createProductDto.price;
      existingProduct.current_stock = createProductDto.current_stock;
      existingProduct.minimum_stock = createProductDto.minimum_stock;
      existingProduct.category = category;
      await this.productRepository.save(existingProduct);
      await this.syncProductToppings(existingProduct, toppingId ?? []);
      return this.productRepository.findOne({
        where: { id: existingProduct.id },
        relations: { category: true, productToppings: { topping: true } },
      });
    }

    // Crear producto
    const product = this.productRepository.create({
      ...productData,
      category,
    });

    const savedProduct = await this.productRepository.save(product);
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
    const { toppingId, ...productData } = updateProductDto;
    const product = await this.productRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado o inactivo');
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

    await this.productRepository.save(updatedProduct);
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

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Formato de imagen no permitido. Usa PNG, JPG, JPEG, WEBP o GIF');
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
