import { ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { Product } from './entities/product.entity';

describe('ProductsService name uniqueness', () => {
  const category = { id: 'category-1', isActive: true };

  const createService = (duplicate: Product | null = null) => {
    const queryBuilder = {
      find: jest.fn().mockResolvedValue(duplicate ? [duplicate] : []),
    };
    const productRepository = {
      ...queryBuilder,
      findOneBy: jest.fn(),
      create: jest.fn((value) => value),
      preload: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const service = new ProductsService(
      productRepository as any,
      { findOneBy: jest.fn().mockResolvedValue(category) } as any,
      { find: jest.fn().mockResolvedValue([]), create: jest.fn(), save: jest.fn(), remove: jest.fn() } as any,
      { findOneBy: jest.fn() } as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
    );

    return { service, productRepository, queryBuilder };
  };

  it('rejects a case-insensitive duplicate name with the requested message', async () => {
    const { service, productRepository } = createService({ id: 'product-1', name: 'frappes' } as Product);

    await expect(service.create({ name: ' FRAPPES ', categoryId: category.id } as any))
      .rejects.toMatchObject({
        message: 'Ya existe un producto con ese nombre',
        status: 409,
      });
    expect(productRepository.create).not.toHaveBeenCalled();
      expect(productRepository.find).toHaveBeenCalledWith({ select: { id: true, name: true } });
    });

    it('rejects a small spelling variation such as Frappes and frappe', async () => {
      const { service } = createService({ id: 'product-1', name: 'Frappes' } as Product);

      await expect(service.create({ name: 'frappe', categoryId: category.id } as any))
        .rejects.toMatchObject({ message: 'Ya existe un producto con ese nombre', status: 409 });
  });

  it('does not treat the product being edited as a duplicate', async () => {
      const { service, productRepository } = createService();
    const currentProduct = { id: 'product-1', isActive: true, name: 'Frappes' };
    const updatedProduct = { ...currentProduct, name: 'frappes' };
      productRepository.find.mockResolvedValue([currentProduct]);
    productRepository.findOneBy.mockResolvedValue(currentProduct);
    productRepository.preload.mockResolvedValue(updatedProduct);
    productRepository.save.mockResolvedValue(updatedProduct);
    productRepository.findOne.mockResolvedValue(updatedProduct);

    await service.update('product-1', { name: '  frappes  ' });

    expect(productRepository.find).toHaveBeenCalledWith({ select: { id: true, name: true } });
    expect(productRepository.preload).toHaveBeenCalledWith({ id: 'product-1', name: 'frappes' });
  });

  it('maps a PostgreSQL unique-index race to the requested conflict message', async () => {
    const { service, productRepository } = createService();
    productRepository.create.mockReturnValue({ name: 'Frappes' });
    productRepository.save.mockRejectedValue({
      driverError: { code: '23505', constraint: 'IDX_products_normalized_name' },
    });

    await expect(service.create({ name: 'Frappes', categoryId: category.id } as any))
      .rejects.toBeInstanceOf(ConflictException);
  });
});