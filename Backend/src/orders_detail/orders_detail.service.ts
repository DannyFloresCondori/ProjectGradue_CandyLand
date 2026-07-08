import {
  Injectable,
} from '@nestjs/common';

import { CreateOrdersDetailDto } from './dto/create-orders_detail.dto';
import { UpdateOrdersDetailDto } from './dto/update-orders_detail.dto';


@Injectable()
export class OrdersDetailService {

  async create(createOrdersDetailDto: CreateOrdersDetailDto) {
    return 'This action adds a new ordersDetail';
  }

  async findAll() {
    return `This action returns all ordersDetail`;
  }

  async findOne(id: string) {
    return `This action returns a #${id} ordersDetail`;
  }

  async update(id: string, updateOrdersDetailDto: UpdateOrdersDetailDto) {
    return `This action updates a #${id} ordersDetail`;
  }

  async remove(id: string) {
    return `This action removes a #${id} ordersDetail`;
  }
}
