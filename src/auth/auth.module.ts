import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { User } from 'src/users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { Patient } from 'src/users/entities/patient.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { UsersModule } from 'src/users/users.module';
import { AtStrategy } from './strategies/at.strategy';
import { RtStrategy } from './strategies/rt.strategy';
import { Admin } from 'src/users/entities/admin.entity';
import { Paramedic } from 'src/users/entities/paramedic.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    DatabaseModule, UsersModule, MailModule,
    TypeOrmModule.forFeature([Auth, User, Patient, Doctor, Pharmacist, Admin, Paramedic]),
    JwtModule.register({
      global: true
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, AtStrategy, RtStrategy],
})
export class AuthModule {}
