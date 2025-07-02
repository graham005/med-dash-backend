import { Module } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';
import { Consultation } from './entities/consultation.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Consultation, Doctor])
  ],
  controllers: [ConsultationController],
  providers: [ConsultationService],
})
export class ConsultationModule {}
