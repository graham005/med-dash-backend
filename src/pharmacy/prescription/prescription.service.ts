import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { Patient } from 'src/users/entities/patient.entity';
import { Prescription } from './entities/prescription.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from 'src/users/entities/doctor.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class PrescriptionService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>
  ) { }

  async create(createPrescriptionDto: CreatePrescriptionDto, user: User) {
    const doctor = await this.doctorRepository.findOne({
      where: {
        user: {
          id: user.id
        }
      }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Check if the patient exists
    const patient = await this.patientRepository.findOne({
      where: { id: createPrescriptionDto.patientId }
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const existingPrescription = await this.prescriptionRepository.findOne({ where: { name: createPrescriptionDto.name } });
    if (existingPrescription) {
      throw new Error('Prescription with this name already exists');
    }

    const newPrescription = this.prescriptionRepository.create({
      ...createPrescriptionDto,
      prescribedBy: doctor,
      patient: patient
    });
    await this.prescriptionRepository.save(newPrescription);

    return newPrescription;
  }
  async findAll(user: User): Promise<Prescription[]> {
    // Try to find doctor profile
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (doctor) {
      // If user is a doctor, return prescriptions prescribed by this doctor
      return await this.prescriptionRepository.find({
        where: {
          prescribedBy: { id: doctor.id }
        },
        relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user']
      });
    }

    // Try to find patient profile
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (patient) {
      // If user is a patient, return prescriptions for this patient
      return await this.prescriptionRepository.find({
        where: {
          patient: { id: patient.id }
        },
        relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user']
      });
    }

    // If neither doctor nor patient, deny access
    throw new NotFoundException('Profile not found');
  }

  async findOne(id: string, user: User): Promise<Prescription | null> {
    // Try to find doctor profile
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (doctor) {
      // If user is a doctor, return prescription only if prescribed by this doctor
      const prescription = await this.prescriptionRepository.findOne({
        where: {
          id,
          prescribedBy: { id: doctor.id }
        },
        relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user']
      });

      if (!prescription) {
        throw new NotFoundException('Prescription not found');
      }

      return prescription;
    }

    // Try to find patient profile
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (patient) {
      // If user is a patient, return prescription only if it belongs to this patient
      const prescription = await this.prescriptionRepository.findOne({
        where: {
          id,
          patient: { id: patient.id }
        },
        relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user']
      });

      if (!prescription) {
        throw new NotFoundException('Prescription not found');
      }

      return prescription;
    }

    // If neither doctor nor patient, deny access
    throw new NotFoundException('Profile not found');
  }

  async update(id: string, updatePrescriptionDto: UpdatePrescriptionDto, user: User): Promise<string | number | void> {
    const doctor = await this.doctorRepository.findOne({
      where: {
        user: {
          id: user.id
        }
      }
    })
    if (!doctor) {
      throw new NotFoundException('Doctor Profile not found')
    }
    let updateData: any = { ...updatePrescriptionDto };
    if (updatePrescriptionDto.patientId) {
      updateData.patient = { id: updatePrescriptionDto.patientId };
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
        return this.findOne(id, user);
      });
  }

  async remove(id: string, user: User): Promise<string | void> {
    // Find the doctor profile for the logged-in user
    const doctor = await this.doctorRepository.findOne({
      where: {
        user: {
          id: user.id
        }
      }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor Profile not found');
    }

    // Find the prescription and ensure it was prescribed by this doctor
    const prescription = await this.prescriptionRepository.findOne({
      where: {
        id: id,
        prescribedBy: doctor
      }
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found or you do not have permission to delete it');
    }

    return await this.prescriptionRepository.delete(id)
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
