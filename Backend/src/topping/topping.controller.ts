import { AllowRoles } from '../auth/auth.decorators';
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ToppingService } from './topping.service';
import { CreateToppingDto } from './dto/create-topping.dto';
import { UpdateToppingDto } from './dto/update-topping.dto';

@Controller('topping')
export class ToppingController {
  constructor(private readonly toppingService: ToppingService) {}

  @AllowRoles('admin')
  @Post()
  create(@Body() createToppingDto: CreateToppingDto) {
    return this.toppingService.create(createToppingDto);
  }

  @Get()
  findAll() {
    return this.toppingService.findAll();
  }

  @AllowRoles('admin')
  @Get('management/all')
  findAllIncludingInactive() {
    return this.toppingService.findAllIncludingInactive();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.toppingService.findOne(id);
  }

  @AllowRoles('admin')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateToppingDto: UpdateToppingDto) {
    return this.toppingService.update(id, updateToppingDto);
  }

  @AllowRoles('admin')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.toppingService.reactivate(id);
  }

  @AllowRoles('admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.toppingService.remove(id);
  }
}
