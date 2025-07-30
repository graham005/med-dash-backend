import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { RequestRefillDto } from './dto/request-refill.dto';
import { ApproveRefillDto } from './dto/approve-refill.dto';
import { Patient } from 'src/users/entities/patient.entity';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from 'src/users/entities/doctor.entity';
import { User } from 'src/users/entities/user.entity';
import { Medicine } from '../medicine/entities/medicine.entity';

@Injectable()
export class PrescriptionService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Medicine)
    private readonly medicineRepository: Repository<Medicine>
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

    // Check medicine stock for each medication
    for (const med of createPrescriptionDto.medications) {
      const medicine = await this.medicineRepository.findOne({ where: { id: med.medicineId } });
      if (!medicine) {
        throw new NotFoundException(`Medicine with ID ${med.medicineId} not found`);
      }
      if (medicine.stock <= 0) {
        throw new Error(`Medicine "${medicine.name}" is out of stock`);
      }
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

  async getPatientByUserId(userId: string): Promise<Patient | null> {
    try {
      const patient = await this.patientRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user']
      });
      return patient;
    } catch (error) {
      console.error('Error finding patient by user ID:', error);
      return null;
    }
  }

  async findByPatientId(patientId: string): Promise<Prescription[]> {
    try {
      // Remove the non-existent 'prescribedMedicines' relation
      const prescriptions = await this.prescriptionRepository.find({
        where: { patient: { id: patientId } },
        relations: [
          'prescribedBy', 
          'prescribedBy.user', 
          'patient', 
          'patient.user'
        ]
      });
      return prescriptions;
    } catch (error) {
      console.error('Error finding prescriptions by patient ID:', error);
      return [];
    }
  }

  // Optional: Helper method to get detailed prescription info for the health bot
  async getPrescriptionDetailsForBot(userId: string): Promise<any[]> {
    try {
      const patient = await this.getPatientByUserId(userId);
      if (!patient) {
        return [];
      }

      const prescriptions = await this.findByPatientId(patient.id);
      
      // Format the data to include medicine details
      return prescriptions.map(prescription => ({
        id: prescription.id,
        name: prescription.name,
        prescribedBy: prescription.prescribedBy?.user?.firstName + ' ' + prescription.prescribedBy?.user?.lastName,
        patientName: prescription.patient?.user?.firstName + ' ' + prescription.patient?.user?.lastName,
        medications: prescription.medications || [],
      }));
    } catch (error) {
      console.error('Error getting prescription details for bot:', error);
      return [];
    }
  }

  // Add new refill methods to the existing service
  async requestRefill(prescriptionId: string, requestRefillDto: RequestRefillDto, user: User): Promise<Prescription> {
    // Find patient profile
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    // Find the prescription
    const prescription = await this.prescriptionRepository.findOne({
      where: {
        id: prescriptionId,
        patient: { id: patient.id }
      },
      relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user']
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Check if prescription can be refilled
    if (!prescription.canBeRefilled) {
      throw new BadRequestException('This prescription cannot be refilled. Either it has expired, reached refill limit, or is not active.');
    }

    // Check if there's already a pending refill request
    if (prescription.status === PrescriptionStatus.REFILL_REQUESTED) {
      throw new BadRequestException('A refill request is already pending for this prescription');
    }

    // Update prescription status and refill request details
    prescription.status = PrescriptionStatus.REFILL_REQUESTED;
    prescription.refillRequestedAt = new Date();
    prescription.refillRequestNotes = requestRefillDto.notes || null;

    return await this.prescriptionRepository.save(prescription);
  }

  async approveRefill(prescriptionId: string, approveRefillDto: ApproveRefillDto, user: User): Promise<Prescription> {
    // Find doctor profile
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Find the prescription
    const prescription = await this.prescriptionRepository.findOne({
      where: {
        id: prescriptionId,
        prescribedBy: { id: doctor.id }
      },
      relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user']
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found or you do not have permission to approve this refill');
    }

    // Check if prescription has a pending refill request
    if (prescription.status !== PrescriptionStatus.REFILL_REQUESTED) {
      throw new BadRequestException('This prescription does not have a pending refill request');
    }

    // Check if prescription can still be refilled
    if (!prescription.canBeRefilled) {
      throw new BadRequestException('This prescription cannot be refilled. Either it has expired or reached refill limit.');
    }

    // Update prescription
    prescription.status = PrescriptionStatus.REFILL_APPROVED;
    prescription.refillsUsed += 1;
    prescription.lastRefillDate = new Date();
    prescription.refillRequestedAt = null;
    prescription.refillRequestNotes = null;

    // Add additional refills if specified
    if (approveRefillDto.additionalRefills) {
      prescription.refillsAllowed += approveRefillDto.additionalRefills;
    }

    return await this.prescriptionRepository.save(prescription);
  }

  async rejectRefill(prescriptionId: string, rejectionNotes: string, user: User): Promise<Prescription> {
    // Find doctor profile
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Find the prescription
    const prescription = await this.prescriptionRepository.findOne({
      where: {
        id: prescriptionId,
        prescribedBy: { id: doctor.id }
      },
      relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user']
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found or you do not have permission to reject this refill');
    }

    // Check if prescription has a pending refill request
    if (prescription.status !== PrescriptionStatus.REFILL_REQUESTED) {
      throw new BadRequestException('This prescription does not have a pending refill request');
    }

    // Reset prescription to active status and clear refill request data
    prescription.status = PrescriptionStatus.ACTIVE;
    prescription.refillRequestedAt = null;
    prescription.refillRequestNotes = rejectionNotes;

    return await this.prescriptionRepository.save(prescription);
  }

  async getPendingRefillRequests(user: User): Promise<Prescription[]> {
    // Find doctor profile
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Find all prescriptions with pending refill requests for this doctor
    return await this.prescriptionRepository.find({
      where: {
        prescribedBy: { id: doctor.id },
        status: PrescriptionStatus.REFILL_REQUESTED
      },
      relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user'],
      order: { refillRequestedAt: 'ASC' }
    });
  }

  async getPatientRefillHistory(user: User): Promise<Prescription[]> {
    // Find patient profile
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    // Find all prescriptions for this patient that have refill history
    return await this.prescriptionRepository.find({
      where: {
        patient: { id: patient.id }
      },
      relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user'],
      order: { lastRefillDate: 'DESC' }
    });
  }

  async checkPrescriptionExpiry(): Promise<void> {
    // This method can be called by a cron job to automatically expire prescriptions
    const expiredPrescriptions = await this.prescriptionRepository
      .createQueryBuilder('prescription')
      .where('prescription.validityDate < :now', { now: new Date() })
      .andWhere('prescription.status != :expired', { expired: PrescriptionStatus.EXPIRED })
      .getMany();

    for (const prescription of expiredPrescriptions) {
      prescription.status = PrescriptionStatus.EXPIRED;
      await this.prescriptionRepository.save(prescription);
    }
  }

  async validatePrescriptionForOrder(prescriptionId: string): Promise<boolean> {
    const prescription = await this.prescriptionRepository.findOne({
      where: { id: prescriptionId }
    });

    if (!prescription) {
      return false;
    }

    return prescription.canBeOrdered;
  }
}
