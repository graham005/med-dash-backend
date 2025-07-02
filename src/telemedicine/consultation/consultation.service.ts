import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { Consultation } from './entities/consultation.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from 'src/users/entities/doctor.entity';
import { ConsultationStatus } from 'src/enums';

@Injectable()
export class ConsultationService {
   constructor(
      @InjectRepository(Consultation) private readonly consultationRepository: Repository<Consultation>,
      @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>
    ) {}
    async create(createConsultationDto: CreateConsultationDto) {
      const doctor = await this.doctorRepository.findOne({ where: { id: createConsultationDto.doctorId } })
      if(!doctor) {
        throw new NotFoundException('Doctor not found');
      }
      const newConsultation = this.consultationRepository.create({
        startTime: createConsultationDto.startTime,
        endTime: createConsultationDto.endTime,
        doctor: doctor,
        status: createConsultationDto.status
      });
      return this.consultationRepository.save(newConsultation)
    }
  
    async findAll() {
      const consultations = await this.consultationRepository.find()
      if(consultations.length === 0) {
        throw new NotFoundException('No Consultations Found')
      }
      return consultations;
    }
  
    async findOne(id: number) {
      const consultation = await this.consultationRepository.findOne({ where: { id: id.toString() } });
      if (!consultation) {
        throw new NotFoundException('Consultation not found');
      }
      return consultation;
    }
  
    async update(id: number, updateConsultationDto: UpdateConsultationDto) {
      return await this.consultationRepository.update(id, updateConsultationDto)
        .then((result) => {
          if (result.affected === 0) {
            throw new NotFoundException('Consultation not found.')
          }
        }).catch((error) => {
          console.error('Error updating consultation:', error)
          throw new Error(`Error uodating consultation: ${error.message}` )
        }).finally(() => {
          return this.findOne(id)
        })
    }
  
    async remove(id: number) {
      const consultation = await this.consultationRepository.findOne({ where: { id: id.toString() } });
      if (!consultation) {
        throw new NotFoundException('Consultation not found');
      }
      consultation.status = ConsultationStatus.CANCELLED;
      await this.consultationRepository.save(consultation);
      return consultation;
    }
}
