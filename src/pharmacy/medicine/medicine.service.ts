import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { Medicine } from './entities/medicine.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class MedicineService {
  constructor(
    @InjectRepository(Medicine) private readonly medicineRepository: Repository<Medicine>,
    @InjectRepository(Pharmacist) private readonly pharmacistRepository: Repository<Pharmacist>
  ) { }


  async create(createMedicineDto: CreateMedicineDto, user: User) {
    const pharmacist = await this.pharmacistRepository.findOne({ where: { user: { id: user.id } } })
    if (!pharmacist) {
      throw new NotFoundException('Pharmacist profile not found')
    }
    const existingMedicine = await this.medicineRepository.findOne({ where: { name: createMedicineDto.name } });
    if (existingMedicine) {
      throw new Error('Medicine with this name already exists');

    }
    const newMedicine = await this.medicineRepository.create({ addedBy: pharmacist, ...createMedicineDto })
    await this.medicineRepository.save(newMedicine);

    return newMedicine;
  }
  async findAll(user: User): Promise<Medicine[]> {
    const pharmacist = await this.pharmacistRepository.findOne({ where: { user: { id: user.id } } })
    if (!pharmacist) {
      throw new NotFoundException('Pharmacist profile not found')
    }
    const medicines = await this.medicineRepository.find({
      where: {
        addedBy: {
          id: pharmacist.user.id
        }
      }
    });
    if (medicines.length === 0) {
      throw new NotFoundException('Medicine out of stock');
    }
    return medicines;
  }

  async findOne(id: string, user: User): Promise<Medicine> {
    const pharmacist = await this.pharmacistRepository.findOne({ where: { user: { id: user.id } } })
    if (!pharmacist) {
      throw new NotFoundException('Pharmacist profile not found')
    }
    const medicine = await this.medicineRepository.findOne({
      where: {
        id: id,
        addedBy: {
          id: pharmacist.user.id
        }
      }
    });

    if (!medicine) {
      throw new NotFoundException('Medicine out of stock');
    }

    return medicine;
  }

  async update(id: string, updateMedicineDto: UpdateMedicineDto, user: User): Promise<string | number | void> {
    const pharmacist = await this.pharmacistRepository.findOne({ where: { user: { id: user.id } } })
    if (!pharmacist) {
      throw new NotFoundException('Pharmacist profile not found')
    }
    return await this.medicineRepository.update(id, updateMedicineDto)
      .then((result) => {
        if (result.affected === 0) {
          throw new NotFoundException('Medicine not found');
        }
      }).catch((error) => {
        console.error('Error updating medicine:', error);
        throw new Error(`Error updating medicine: ${error.message}`);
      })
      .finally(() => {
        return this.findOne(id, user);
      });
  }

  async remove(id: string, user: User): Promise<string | void> {
    // Find the pharmacist profile for the logged-in user
    const pharmacist = await this.pharmacistRepository.findOne({ where: { user: { id: user.id } } });
    if (!pharmacist) {
      throw new NotFoundException('Pharmacist profile not found');
    }

    // Find the medicine and ensure it was added by this pharmacist
    const medicine = await this.medicineRepository.findOne({
      where: {
        id: id,
        addedBy: {
          id: pharmacist.user.id
        }
      }
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found or you do not have permission to delete it');
    }

    return await this.medicineRepository.delete(id)
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
