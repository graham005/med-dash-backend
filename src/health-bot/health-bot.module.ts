import { Module } from '@nestjs/common';
import { HealthBotService } from './health-bot.service';
import { HealthBotController } from './health-bot.controller';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { HttpModule } from '@nestjs/axios';
import { AppointmentsModule } from 'src/appointments/appointments.module';
import { Appointment } from 'src/appointments/entities/appointment.entity';
import { Prescription } from 'src/pharmacy/prescription/entities/prescription.entity';
import { PrescriptionModule } from 'src/pharmacy/prescription/prescription.module';
import { MedicineModule } from 'src/pharmacy/medicine/medicine.module'; // Add this import

@Module({
  imports:[
    UsersModule,
    TypeOrmModule.forFeature([User, Appointment, Prescription]),
    HttpModule,
    AppointmentsModule,
    PrescriptionModule,
    MedicineModule,
  ],
  controllers: [HealthBotController],
  providers: [HealthBotService],
})
export class HealthBotModule {}
