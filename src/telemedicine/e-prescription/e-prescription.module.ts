import { Module } from '@nestjs/common';
import { EPrescriptionService } from './e-prescription.service';
import { EPrescriptionController } from './e-prescription.controller';
import { EPrescription } from './entities/e-prescription.entity';
import { Consultation } from '../consultation/entities/consultation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([EPrescription, Consultation])
  ],
  controllers: [EPrescriptionController],
  providers: [EPrescriptionService],
})
export class EPrescriptionModule {}
