import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AvailabilityModule } from 'src/availability/availability.module';
import { Doctor } from './entities/doctor.entity';
import { Pharmacist } from './entities/pharmacist.entity';
import { Patient } from './entities/patient.entity';
import { Admin } from './entities/admin.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User, Doctor, Pharmacist, Patient, Admin]),
    forwardRef(() => AvailabilityModule)
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
