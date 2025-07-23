import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from './logger.middleware';
import { APP_GUARD } from '@nestjs/core';
import { AtGuard } from './auth/guards/at.guard';
import { HealthBotModule } from './health-bot/health-bot.module';
import { PaymentsModule } from './payments/payments.module';
import { ZoomService } from './zoom/zoom.service';
import {  MessagingModule } from './message/message.module';
import { MailModule } from './mail/mail.module';
import { EMSModule } from './ems/ems.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    AuthModule, UsersModule, AppointmentsModule,DatabaseModule, AvailabilityModule,
    MedicineModule, PrescriptionModule, PharmacyOrderModule, ConsultationModule, EPrescriptionModule, 
    HealthBotModule, PaymentsModule, MessagingModule, MailModule, EMSModule
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: AtGuard
    },
    ZoomService,
  ],
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('appointments', 'auth', 'availability', 'medicine', 'pharmacyOrders', 'prescription', 'consultation', 'e-prescription', 'users', 'payments')
  }
}
