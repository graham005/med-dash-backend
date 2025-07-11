import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { Medicine } from './entities/medicine.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { User } from 'src/users/entities/user.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { Patient } from 'src/users/entities/patient.entity';

@Injectable()
export class MedicineService {
  constructor(
    @InjectRepository(Medicine) private readonly medicineRepository: Repository<Medicine>,
    @InjectRepository(Pharmacist) private readonly pharmacistRepository: Repository<Pharmacist>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>
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
  async findAll(): Promise<Medicine[]> {
    const medicines = await this.medicineRepository.find({
      relations: ['addedBy', 'addedBy.user']
    });

    if (medicines.length === 0) {
      throw new NotFoundException('No medicines found');
    }

    return medicines;
  }

  async findOne(id: string): Promise<Medicine> {
    const medicine = await this.medicineRepository.findOne({
      where: { id },
      relations: ['addedBy', 'addedBy.user']
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    return medicine;
  }

  async update(id: string, updateMedicineDto: UpdateMedicineDto): Promise<string | number | void> {
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
        return this.findOne(id);
      });
  }

  async remove(id: string, user: User): Promise<string | void> {
    // Check if user is a pharmacist
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (!pharmacist) {
      throw new NotFoundException('Pharmacist profile not found');
    }

    // Allow any pharmacist to remove any medicine
    const medicine = await this.medicineRepository.findOne({
      where: { id }
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
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
