import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MessagingService } from './message.service';
import { MessagingController } from './message.controller';
import { MessagingGateway } from './message.gateway';
import { Message } from './entities/message.entity';
import { User } from 'src/users/entities/user.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { Patient } from 'src/users/entities/patient.entity';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { Appointment } from 'src/appointments/entities/appointment.entity';
import { PharmacyOrder } from 'src/pharmacy/pharmacy-order/entities/pharmacy-order.entity';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      Message,
      User,
      Doctor,
      Patient,
      Pharmacist,
      Appointment,
      PharmacyOrder,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('AT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}