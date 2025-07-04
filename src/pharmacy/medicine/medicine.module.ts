import { Module } from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { MedicineController } from './medicine.controller';
import { Medicine } from './entities/medicine.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/database/database.module';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Medicine, Pharmacist])
  ],
  controllers: [MedicineController],
  providers: [MedicineService],
})
export class MedicineModule {}
