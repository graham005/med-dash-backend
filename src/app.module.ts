import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { TelemedicineModule } from './telemedicine/telemedicine.module';

@Module({
  imports: [AuthModule, UsersModule, AppointmentsModule, PharmacyModule, TelemedicineModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
