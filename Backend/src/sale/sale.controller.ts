import { AllowRoles } from '../auth/auth.decorators';
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import type { Response } from 'express'; // 👈 import type

@Controller('sale')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @AllowRoles('admin', 'staff')
  @Post()
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.saleService.create(createSaleDto);
  }

  @Get()
  findAll() {
    return this.saleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.saleService.findOne(id);
  }

  // 🎫 TICKET PDF
  @Get(':id/ticket')
  async getTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.saleService.generateTicket(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ticket-${id}.pdf"`,
      'Content-Length': pdfBuffer.byteLength,
    });

    res.end(pdfBuffer);
  }

  @AllowRoles('admin', 'staff')
  @Patch(':id')
  update() {
    throw new BadRequestException('Las ventas no se pueden modificar; solo pueden anularse indicando un motivo.');
  }

  @AllowRoles('admin', 'staff')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.saleService.remove(id, reason);
  }
}