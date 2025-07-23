import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EMSRequest } from './entities/ems.entity';
import { Paramedic } from 'src/users/entities/paramedic.entity';
import { EMSService } from './ems.service';
import { EMSController } from './ems.controller';
import { EMSGateway } from './ems.gateway';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { Patient } from 'src/users/entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EMSRequest, Paramedic, User, Patient]),  UsersModule],
 
  providers: [EMSService, EMSGateway],
  controllers: [EMSController],
  exports: [EMSService, EMSGateway],
})
export class EMSModule {}
