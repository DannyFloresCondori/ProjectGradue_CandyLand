import { AllowRoles } from '../auth/auth.decorators';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrdersDetailService } from './orders_detail.service';
import { CreateOrdersDetailDto } from './dto/create-orders_detail.dto';
import { UpdateOrdersDetailDto } from './dto/update-orders_detail.dto';

@Controller('orders-detail')
export class OrdersDetailController {
  constructor(private readonly ordersDetailService: OrdersDetailService) {}

  @AllowRoles('admin', 'staff')
  @Post()
  create(@Body() createOrdersDetailDto: CreateOrdersDetailDto) {
    return this.ordersDetailService.create(createOrdersDetailDto);
  }

  @Get()
  findAll() {
    return this.ordersDetailService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersDetailService.findOne(id);
  }

  @AllowRoles('admin', 'staff')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrdersDetailDto: UpdateOrdersDetailDto) {
    return this.ordersDetailService.update(id, updateOrdersDetailDto);
  }

  @AllowRoles('admin', 'staff')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersDetailService.remove(id);
  }
}
