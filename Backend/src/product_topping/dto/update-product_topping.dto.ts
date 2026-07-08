import { PartialType } from '@nestjs/mapped-types';
import { CreateProductToppingDto } from './create-product_topping.dto';

export class UpdateProductToppingDto extends PartialType(CreateProductToppingDto) {}
