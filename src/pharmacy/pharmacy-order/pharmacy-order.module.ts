import { Module } from '@nestjs/common';
import { PharmacyOrderService } from './pharmacy-order.service';
import { PharmacyOrderController } from './pharmacy-order.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyOrder } from './entities/pharmacy-order.entity';
import { Prescription } from '../prescription/entities/prescription.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([PharmacyOrder, Prescription])
  ],
  controllers: [PharmacyOrderController],
  providers: [PharmacyOrderService],
})
export class PharmacyOrderModule {}
