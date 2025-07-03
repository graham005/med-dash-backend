import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/database/database.module';
import { User } from 'src/users/entities/user.entity';
import { AvailabilitySlot } from 'src/availability/entities/availability.entity';
import { Patient } from 'src/users/entities/patient.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Appointment, Doctor, User, AvailabilitySlot, Patient])
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
