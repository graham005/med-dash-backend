import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEPrescriptionDto } from './dto/create-e-prescription.dto';
import { UpdateEPrescriptionDto } from './dto/update-e-prescription.dto';
import { EPrescription } from './entities/e-prescription.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Consultation } from '../consultation/entities/consultation.entity';

@Injectable()
export class EPrescriptionService {
  constructor(
      @InjectRepository(EPrescription)
      private readonly eprescriptionRepository: Repository<EPrescription>,
      @InjectRepository(Consultation)
      private readonly consultationRepository: Repository<Consultation>
    ){}
    
    async create(createEPrescriptionDto: CreateEPrescriptionDto) {
    const consultation = await this.consultationRepository.findOne({ where: { id: createEPrescriptionDto.consultationId } });
    if (!consultation) {
      throw new Error('Consultation not found');
    }
  
    const newPrescription = this.eprescriptionRepository.create({
      ...createEPrescriptionDto,
      consultation: consultation
    });
    await this.eprescriptionRepository.save(newPrescription);
  
    return newPrescription;
  }
    async findAll(): Promise < EPrescription[] > {
    const categories = await this.eprescriptionRepository.find();
    if(categories.length === 0) {
    throw new NotFoundException('No E-Prescriptions found');
  }
  return categories;
    }
  
    async findOne(id: number): Promise < EPrescription > {
    const prescription = await this.eprescriptionRepository.findOne({ where: { id: id.toString() } });
  
    if(!prescription) {
      throw new NotFoundException('Prescription not found');
    }
  
      return prescription;
  }
  
  async update(id: number, updateEPrescriptionDto: UpdateEPrescriptionDto): Promise<string | number | void> {
    let updateData: any = { ...updateEPrescriptionDto };
    if (updateEPrescriptionDto.consultationId) {
      updateData.consultation = { id: updateEPrescriptionDto.consultationId };
    }
  
    return await this.eprescriptionRepository.update(id, updateData)
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
    return this.eprescriptionRepository.delete(id)
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
