import { Module } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import { PrescriptionController } from './prescription.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prescription } from './entities/prescription.entity';
import { Patient } from 'src/users/entities/patient.entity';
import { Doctor } from 'src/users/entities/doctor.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Prescription, Patient, Doctor])
  ],
  controllers: [PrescriptionController],
  providers: [PrescriptionService],
})
export class PrescriptionModule {}
