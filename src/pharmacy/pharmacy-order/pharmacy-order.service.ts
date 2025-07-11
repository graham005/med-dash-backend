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
    return await this.pharmacyorderRepository.update(id, updatePharmacyOrderDto)
      .then((result) => {
        if (result.affected === 0) {
          throw new NotFoundException('PharmacyOrder not found.')
        }
      }).catch((error) => {
        console.error('Error updating pharmacyorder:', error)
        throw new Error(`Error uodating pharmacyorder: ${error.message}`)
      }).finally(() => {
        return this.findOne(id, user)
      })
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
}
