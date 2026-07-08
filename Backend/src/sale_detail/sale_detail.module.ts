import { Module } from '@nestjs/common';
import { SaleDetailService } from './sale_detail.service';
import { SaleDetailController } from './sale_detail.controller';

@Module({
  controllers: [SaleDetailController],
  providers: [SaleDetailService],
})
export class SaleDetailModule {}
