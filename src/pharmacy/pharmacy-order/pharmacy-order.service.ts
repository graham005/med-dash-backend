import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { UpdatePharmacyOrderDto } from './dto/update-pharmacy-order.dto';
import { PharmacyOrder } from './entities/pharmacy-order.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { Prescription } from '../prescription/entities/prescription.entity';
import { OrderStatus } from 'src/enums';
import { User } from 'src/users/entities/user.entity';
import { Patient } from 'src/users/entities/patient.entity';

@Injectable()
export class PharmacyOrderService {
  constructor(
    @InjectRepository(PharmacyOrder) private readonly pharmacyorderRepository: Repository<PharmacyOrder>,
    @InjectRepository(Prescription) private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(Pharmacist) private readonly pharmacistRepository: Repository<Pharmacist>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
  ) { }
  async create(createPharmacyOrderDto: CreatePharmacyOrderDto, user: User) {
    const patient = await this.patientRepository.findOne({
      where: {
        user: {
          id: user.id
        }
      }
    })
    if (!patient) {
      throw new NotFoundException('Patient profile not found')
    }
    const prescription = await this.prescriptionRepository.findOne({ where: { id: createPharmacyOrderDto.prescriptionId } })
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    const newPharmacyOrder = this.pharmacyorderRepository.create({
      ...createPharmacyOrderDto,
      patient,
      prescription

    });
    return this.pharmacyorderRepository.save(newPharmacyOrder)
  }

  async findAll(user: User) {
    // Check if user is a patient
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (patient) {
      // Patient: return only their orders
      const pharmacyorders = await this.pharmacyorderRepository.find({
        where: { patient: { id: patient.id } },
        relations: ['prescription', 'prescription.prescribedBy', 'prescription.patient', 'prescription.patient.user'],
      });
      if (pharmacyorders.length === 0) {
        console.error('No PharmacyOrders Found');
      }
      return pharmacyorders;
    }

    // Check if user is a pharmacist
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (pharmacist) {
      // Pharmacist: return all orders
      const pharmacyorders = await this.pharmacyorderRepository.find({
        relations: ['prescription', 'prescription.prescribedBy', 'prescription.prescribedBy.user', 'prescription.patient', 'prescription.patient.user'],
      });
      if (pharmacyorders.length === 0) {
        console.error('No PharmacyOrders Found');
      }
      return pharmacyorders;
    }

    // If neither, deny access or return empty
    console.error('Profile not found');
  }

  async findOne(id: string, user: User) {
    // Check if user is a patient
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (patient) {
      // Patient: return only their own order
      const pharmacyorder = await this.pharmacyorderRepository.findOne({
        where: {
          id,
          patient: { id: patient.id }
        },
        relations: ['prescription', 'prescription.prescribedBy', 'prescription.prescribedBy.user', 'prescription.patient', 'prescription.patient.user'],
      });
      if (!pharmacyorder) {
        console.error('PharmacyOrder not found');
      }
      return pharmacyorder;
    }

    // Check if user is a pharmacist
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (pharmacist) {
      // Pharmacist: can access any order
      const pharmacyorder = await this.pharmacyorderRepository.findOne({
        where: { id },
        relations: ['prescription', 'prescription.prescribedBy', 'prescription.prescribedBy.user', 'prescription.patient', 'prescription.patient.user'],

      });
      if (!pharmacyorder) {
        console.error('PharmacyOrder not found');
      }
      return pharmacyorder;
    }

    // If neither, deny access
    throw new NotFoundException('Profile not found');
  }

  async update(id: string, updatePharmacyOrderDto: UpdatePharmacyOrderDto, user: User) {
    // Check if user is a patient
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (patient) {
      // Patient: can only update their own orders and only the status field
      const pharmacyorder = await this.pharmacyorderRepository.findOne({
        where: {
          id,
          patient: { id: patient.id }
        }
      });

      if (!pharmacyorder) {
        throw new NotFoundException('PharmacyOrder not found');
      }

      // Patients can only update the status field to cancel orders
      const allowedPatientUpdates: Partial<UpdatePharmacyOrderDto> = {};
      if (updatePharmacyOrderDto.status) {
        // Validate patient can only set certain statuses
        const allowedStatusesForPatient = [OrderStatus.CANCELLED, OrderStatus.CONFIRMED];
        if (allowedStatusesForPatient.includes(updatePharmacyOrderDto.status)) {
          allowedPatientUpdates.status = updatePharmacyOrderDto.status;
        } else {
          throw new Error('Patients can only cancel orders');
        }
      }

      if (Object.keys(allowedPatientUpdates).length === 0) {
        throw new Error('No valid fields to update. Patients can only update status to cancel orders');
      }

      try {
        const result = await this.pharmacyorderRepository.update(id, allowedPatientUpdates);

        if (result.affected === 0) {
          throw new NotFoundException('PharmacyOrder not found');
        }

        return await this.findOne(id, user);
      } catch (error) {
        console.error('Error updating pharmacy order:', error);
        throw new Error(`Error updating pharmacy order: ${error.message}`);
      }
    }

    // Check if user is a pharmacist
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (pharmacist) {
      // Pharmacist: can update any order and all fields
      const pharmacyorder = await this.pharmacyorderRepository.findOne({
        where: { id }
      });

      if (!pharmacyorder) {
        throw new NotFoundException('PharmacyOrder not found');
      }

      // Validate status transitions for pharmacists
      if (updatePharmacyOrderDto.status) {
        const validTransitions = this.getValidStatusTransitions(pharmacyorder.status);
        if (!validTransitions.includes(updatePharmacyOrderDto.status)) {
          throw new Error(`Invalid status transition from ${pharmacyorder.status} to ${updatePharmacyOrderDto.status}`);
        }
      }

      try {
        const result = await this.pharmacyorderRepository.update(id, updatePharmacyOrderDto);

        if (result.affected === 0) {
          throw new NotFoundException('PharmacyOrder not found');
        }

        return await this.findOne(id, user);
      } catch (error) {
        console.error('Error updating pharmacy order:', error);
        throw new Error(`Error updating pharmacy order: ${error.message}`);
      }
    }

    // If neither patient nor pharmacist, deny access
    throw new NotFoundException('Profile not found or insufficient permissions');
  }

  async remove(id: string, user: User): Promise<PharmacyOrder> {
    // Check if user is a patient
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (patient) {
      // Patient: can only cancel their own order
      const pharmacyorder = await this.pharmacyorderRepository.findOne({
        where: {
          id,
          patient: { id: patient.id }
        }
      });

      if (!pharmacyorder) {
        throw new NotFoundException('PharmacyOrder not found');
      }

      pharmacyorder.status = OrderStatus.CANCELLED;
      await this.pharmacyorderRepository.save(pharmacyorder);
      return pharmacyorder;
    }

    // Check if user is a pharmacist
    const pharmacist = await this.pharmacistRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    });

    if (pharmacist) {
      // Pharmacist: can cancel any order
      const pharmacyorder = await this.pharmacyorderRepository.findOne({
        where: { id }
      });

      if (!pharmacyorder) {
        throw new NotFoundException('PharmacyOrder not found');
      }

      pharmacyorder.status = OrderStatus.CANCELLED;
      await this.pharmacyorderRepository.save(pharmacyorder);
      return pharmacyorder;
    }

    // If neither, deny access
    throw new NotFoundException('Profile not found');
  }

  private getValidStatusTransitions(currentStatus: OrderStatus): OrderStatus[] {
    const transitions = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [], // Final state
      [OrderStatus.CANCELLED]: [] // Final state
    };

    return transitions[currentStatus] || [];
  }
}
