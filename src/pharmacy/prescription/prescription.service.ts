import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { Patient } from 'src/users/entities/patient.entity';
import { Prescription } from './entities/prescription.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PrescriptionService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>
  ){}
  
  async create(createPrescriptionDto: CreatePrescriptionDto) {
  const existingPrescription = await this.prescriptionRepository.findOne({ where: { name: createPrescriptionDto.name } });
  if (existingPrescription) {
    throw new Error('Prescription with this name already exists');

  }
  // Fetch the patient entity using the patient ID from the DTO
  const patient = await this.patientRepository.findOne({ where: { id: createPrescriptionDto.patient } });
  if (!patient) {
    throw new Error('Patient not found');
  }

  const newPrescription = this.prescriptionRepository.create({
    ...createPrescriptionDto,
    patient: patient
  });
  await this.prescriptionRepository.save(newPrescription);

  return newPrescription;
}
  async findAll(): Promise < Prescription[] > {
  const categories = await this.prescriptionRepository.find();
  if(categories.length === 0) {
  throw new NotFoundException('No categories found');
}
return categories;
  }

  async findOne(id: number): Promise < Prescription > {
  const prescription = await this.prescriptionRepository.findOne({ where: { id: id.toString() } });

  if(!prescription) {
    throw new NotFoundException('Prescription not found');
  }

    return prescription;
}

async update(id: number, updatePrescriptionDto: UpdatePrescriptionDto): Promise<string | number | void> {
  let updateData: any = { ...updatePrescriptionDto };
  if (updatePrescriptionDto.patient) {
    updateData.patient = { id: updatePrescriptionDto.patient };
  }

  return await this.prescriptionRepository.update(id, updateData)
    .then((result) => {
      if (result.affected === 0) {
        throw new NotFoundException('Prescription not found');
      }
    }).catch((error) => {
      console.error('Error updating prescription:', error);
      throw new Error(`Error updating prescription: ${error.message}`);
    })
    .finally(() => {
      return this.findOne(id);
    });
}

remove(id: number): Promise < string | void> {
  return this.prescriptionRepository.delete(id)
    .then((result) => {
      if (result.affected === 0) {
        throw new NotFoundException('Prescription not found');
      }
    }).catch((error) => {
      console.error('Error deleting prescription:', error);
      throw new Error(`Error deleting prescription: ${error.message}`);
    });
}
}
