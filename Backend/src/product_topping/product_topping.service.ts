import { Injectable } from '@nestjs/common';
import { CreateProductToppingDto } from './dto/create-product_topping.dto';
import { UpdateProductToppingDto } from './dto/update-product_topping.dto';

@Injectable()
export class ProductToppingService {
  create(createProductToppingDto: CreateProductToppingDto) {
    return 'This action adds a new productTopping';
  }

  findAll() {
    return `This action returns all productTopping`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productTopping`;
  }

  update(id: number, updateProductToppingDto: UpdateProductToppingDto) {
    return `This action updates a #${id} productTopping`;
  }

  remove(id: number) {
    return `This action removes a #${id} productTopping`;
  }
}
