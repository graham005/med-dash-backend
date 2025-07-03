import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { Medicine } from './entities/medicine.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MedicineService {
  @InjectRepository(Medicine)
  private readonly medicineRepository: Repository<Medicine>
  
  async create(createMedicineDto: CreateMedicineDto) {
    const existingMedicine = await this.medicineRepository.findOne({ where: { name: createMedicineDto.name } });
    if (existingMedicine) {
      throw new Error('Medicine with this name already exists');

    }
    const newMedicine = await this.medicineRepository.create({ ...createMedicineDto})
    await this.medicineRepository.save(newMedicine);

    return newMedicine;
  }
  async findAll(): Promise<Medicine[]> {
    const medicines = await this.medicineRepository.find();
    if (medicines.length === 0) {
      throw new NotFoundException('No medicines found');
    }
    return medicines;
  }

  async findOne(id: number): Promise<Medicine> {
    const medicine = await this.medicineRepository.findOne({ where: { id: id.toString() } });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    return medicine;
  }

  async update(id: number, updateMedicineDto: UpdateMedicineDto): Promise<string | number| void> {
    return await this.medicineRepository.update(id, updateMedicineDto)
      .then((result) => {
        if (result.affected === 0) {
          throw new NotFoundException('Medicine not found');
        }
      }).catch ((error) => {
        console.error('Error updating medicine:', error);
        throw new Error(`Error updating medicine: ${error.message}`);
      })
      .finally(() => {
        return this.findOne(id);
      });
  }

  remove(id: number): Promise<string| void> {
    return this.medicineRepository.delete(id)
      .then((result) => {
        if (result.affected === 0) {
          throw new NotFoundException('Medicine not found');
        }
      }).catch((error) => {
        console.error('Error deleting medicine:', error);
        throw new Error(`Error deleting medicine: ${error.message}`);
      });
  }
}
