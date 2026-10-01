import { AllowRoles } from '../auth/auth.decorators';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductToppingService } from './product_topping.service';
import { CreateProductToppingDto } from './dto/create-product_topping.dto';
import { UpdateProductToppingDto } from './dto/update-product_topping.dto';

@Controller('product-topping')
export class ProductToppingController {
  constructor(private readonly productToppingService: ProductToppingService) {}

  @AllowRoles('admin')
  @Post()
  create(@Body() createProductToppingDto: CreateProductToppingDto) {
    return this.productToppingService.create(createProductToppingDto);
  }

  @Get()
  findAll() {
    return this.productToppingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productToppingService.findOne(+id);
  }

  @AllowRoles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductToppingDto: UpdateProductToppingDto) {
    return this.productToppingService.update(+id, updateProductToppingDto);
  }

  @AllowRoles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productToppingService.remove(+id);
  }
}
