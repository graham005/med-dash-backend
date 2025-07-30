import { Module } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import { PrescriptionController } from './prescription.controller';
import { PrescriptionCronService } from './prescription-cron.service';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prescription } from './entities/prescription.entity';
import { Patient } from 'src/users/entities/patient.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { Medicine } from '../medicine/entities/medicine.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    DatabaseModule, MailModule,
    TypeOrmModule.forFeature([Prescription, Patient, Doctor, User, Medicine]),
    UsersModule
  ],
  controllers: [PrescriptionController],
  providers: [PrescriptionService, PrescriptionCronService],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
