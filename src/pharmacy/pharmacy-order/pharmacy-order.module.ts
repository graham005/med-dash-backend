import { Module } from '@nestjs/common';
import { PharmacyOrderService } from './pharmacy-order.service';
import { PharmacyOrderController } from './pharmacy-order.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyOrder } from './entities/pharmacy-order.entity';
import { Prescription } from '../prescription/entities/prescription.entity';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { Patient } from 'src/users/entities/patient.entity';
import { MailModule } from 'src/mail/mail.module';
import { PrescriptionModule } from '../prescription/prescription.module';

@Module({
  imports: [
    DatabaseModule, MailModule, PrescriptionModule,
    TypeOrmModule.forFeature([PharmacyOrder, Prescription, Pharmacist, User, Patient]),
    UsersModule
  ],
  controllers: [PharmacyOrderController],
  providers: [PharmacyOrderService],
})
export class PharmacyOrderModule {}
