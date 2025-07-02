import { Module } from '@nestjs/common';
import { PharmacyOrderService } from './pharmacy-order.service';
import { PharmacyOrderController } from './pharmacy-order.controller';

@Module({
  controllers: [PharmacyOrderController],
  providers: [PharmacyOrderService],
})
export class PharmacyOrderModule {}
