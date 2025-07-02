import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DatabaseModule } from './database/database.module';
import { AvailabilityModule } from './availability/availability.module';
import { MedicineModule } from './pharmacy/medicine/medicine.module';
import { PharmacyOrderModule } from './pharmacy/pharmacy-order/pharmacy-order.module';
import { PrescriptionModule } from './pharmacy/prescription/prescription.module';
import { ConsultationModule } from './telemedicine/consultation/consultation.module';
import { EPrescriptionModule } from './telemedicine/e-prescription/e-prescription.module';

@Module({
  imports: [AuthModule, UsersModule, AppointmentsModule,DatabaseModule, AvailabilityModule,
    MedicineModule, PrescriptionModule, PharmacyOrderModule, ConsultationModule, EPrescriptionModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
