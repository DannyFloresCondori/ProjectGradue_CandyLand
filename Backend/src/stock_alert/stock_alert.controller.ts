import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { StockAlertService } from './stock_alert.service';
import { CreateStockAlertDto } from './dto/create-stock_alert.dto';
import { UpdateStockAlertDto } from './dto/update-stock_alert.dto';

@Controller('stock-alert')
export class StockAlertController {
  constructor(private readonly stockAlertService: StockAlertService) {}

  @Post()
  create(@Body() createStockAlertDto: CreateStockAlertDto) {
    return this.stockAlertService.create(createStockAlertDto);
  }

  @Get()
  findAll() {
    return this.stockAlertService.findAll();
  }

  @Get('active')
  findActive() {
    return this.stockAlertService.findActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockAlertService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateStockAlertDto: UpdateStockAlertDto) {
    return this.stockAlertService.update(id, updateStockAlertDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockAlertService.remove(id);
  }
}
