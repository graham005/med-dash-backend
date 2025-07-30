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
import { EmailService } from 'src/mail/mail.service';

@Injectable()
export class PharmacyOrderService {
  constructor(
    @InjectRepository(PharmacyOrder) private readonly pharmacyorderRepository: Repository<PharmacyOrder>,
    @InjectRepository(Prescription) private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(Pharmacist) private readonly pharmacistRepository: Repository<Pharmacist>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    private readonly emailService: EmailService
  ) { }

  async create(createPharmacyOrderDto: CreatePharmacyOrderDto, user: User) {
    const patient = await this.patientRepository.findOne({
      where: {
        user: {
          id: user.id
        }
      },
      relations: ['user']
    })
    if (!patient) {
      throw new NotFoundException('Patient profile not found')
    }

    const prescription = await this.prescriptionRepository.findOne({ 
      where: { id: createPharmacyOrderDto.prescriptionId },
      relations: ['prescribedBy', 'prescribedBy.user', 'patient', 'patient.user']
    })
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    const newPharmacyOrder = this.pharmacyorderRepository.create({
      ...createPharmacyOrderDto,
      patient,
      prescription
    });

    const savedOrder = await this.pharmacyorderRepository.save(newPharmacyOrder);

    // Send email notifications after successful order creation
    try {
      // Send order confirmation to patient
      await this.emailService.sendPharmacyOrderConfirmation(
        patient.user.email,
        patient.user.firstName,
        {
          id: savedOrder.id,
          prescriptionName: prescription.name,
          date: savedOrder.createdAt || new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          status: savedOrder.status,
          totalAmount: createPharmacyOrderDto.totalAmount || 0,
          prescribedBy: `Dr. ${prescription.prescribedBy.user.firstName} ${prescription.prescribedBy.user.lastName}`,
          medications: prescription.medications || [],
          orderUrl: `${process.env.FRONTEND_URL}/dashboard/patient/orders/${savedOrder.id}`
        }
      );

      // Send new order notification to all pharmacists
      const pharmacists = await this.pharmacistRepository.find({
        relations: ['user']
      });

      for (const pharmacist of pharmacists) {
        await this.emailService.sendNewPharmacyOrderNotification(
          pharmacist.user.email,
          pharmacist.user.firstName,
          {
            id: savedOrder.id,
            patientName: `${patient.user.firstName} ${patient.user.lastName}`,
            prescriptionName: prescription.name,
            date: savedOrder.createdAt || new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            status: savedOrder.status,
            totalAmount: createPharmacyOrderDto.totalAmount || 0,
            prescribedBy: `Dr. ${prescription.prescribedBy.user.firstName} ${prescription.prescribedBy.user.lastName}`,
            medications: prescription.medications || [],
            orderUrl: `${process.env.FRONTEND_URL}/dashboard/pharmacist/orders/${savedOrder.id}`
          }
        );
      }
    } catch (error) {
      console.error('Failed to send pharmacy order emails:', error);
      // Don't throw error as order creation was successful
    }

    return savedOrder;
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
    // Get the order before update for email notifications
    const existingOrder = await this.pharmacyorderRepository.findOne({
      where: { id },
      relations: ['prescription', 'prescription.prescribedBy', 'prescription.prescribedBy.user', 'prescription.patient', 'prescription.patient.user']
    });

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

        const updatedOrder = await this.findOne(id, user);

        // Send email notification for status change
        if (existingOrder && updatePharmacyOrderDto.status && 
            existingOrder.status !== updatePharmacyOrderDto.status) {
          try {
            await this.emailService.sendPharmacyOrderStatusUpdate(
              existingOrder.prescription.patient.user.email,
              existingOrder.prescription.patient.user.firstName,
              {
                id: existingOrder.id,
                oldStatus: existingOrder.status,
                newStatus: updatePharmacyOrderDto.status,
                prescriptionName: existingOrder.prescription.name,
                date: existingOrder.createdAt || new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                orderUrl: `${process.env.FRONTEND_URL}/dashboard/patient/orders/${existingOrder.id}`
              }
            );
          } catch (error) {
            console.error('Failed to send status update email:', error);
          }
        }

        return updatedOrder;
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

        const updatedOrder = await this.findOne(id, user);

        // Send email notifications for status changes
        if (existingOrder && updatePharmacyOrderDto.status && 
            existingOrder.status !== updatePharmacyOrderDto.status) {
          try {
            // Notify patient of status change
            await this.emailService.sendPharmacyOrderStatusUpdate(
              existingOrder.prescription.patient.user.email,
              existingOrder.prescription.patient.user.firstName,
              {
                id: existingOrder.id,
                oldStatus: existingOrder.status,
                newStatus: updatePharmacyOrderDto.status,
                prescriptionName: existingOrder.prescription.name,
                date: existingOrder.createdAt || new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                orderUrl: `${process.env.FRONTEND_URL}/dashboard/patient/orders/${existingOrder.id}`,
                pharmacistName: `${pharmacist.user.firstName} ${pharmacist.user.lastName}`,
                pharmacyName: pharmacist.pharmacyName
              }
            );

            // Send special notifications for specific status changes
            if (updatePharmacyOrderDto.status === OrderStatus.READY) {
              await this.emailService.sendPharmacyOrderReadyNotification(
                existingOrder.prescription.patient.user.email,
                existingOrder.prescription.patient.user.firstName,
                {
                  id: existingOrder.id,
                  prescriptionName: existingOrder.prescription.name,
                  pharmacistName: `${pharmacist.user.firstName} ${pharmacist.user.lastName}`,
                  pharmacyName: pharmacist.pharmacyName,
                  orderUrl: `${process.env.FRONTEND_URL}/dashboard/patient/orders/${existingOrder.id}`
                }
              );
            }
          } catch (error) {
            console.error('Failed to send status update email:', error);
          }
        }

        return updatedOrder;
      } catch (error) {
        console.error('Error updating pharmacy order:', error);
        throw new Error(`Error updating pharmacy order: ${error.message}`);
      }
    }

    // If neither patient nor pharmacist, deny access
    throw new NotFoundException('Profile not found or insufficient permissions');
  }

  async remove(id: string, user: User): Promise<PharmacyOrder> {
    // Get the order before cancellation for email notifications
    const existingOrder = await this.pharmacyorderRepository.findOne({
      where: { id },
      relations: ['prescription', 'prescription.prescribedBy', 'prescription.prescribedBy.user', 'prescription.patient', 'prescription.patient.user']
    });

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
      const cancelledOrder = await this.pharmacyorderRepository.save(pharmacyorder);

      // Send cancellation emails
      if (existingOrder) {
        try {
          // Email to patient confirming cancellation
          await this.emailService.sendPharmacyOrderCancellation(
            existingOrder.prescription.patient.user.email,
            existingOrder.prescription.patient.user.firstName,
            {
              id: existingOrder.id,
              prescriptionName: existingOrder.prescription.name,
              date: existingOrder.createdAt || new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              cancelledBy: 'patient',
              orderUrl: `${process.env.FRONTEND_URL}/dashboard/patient/orders/new`
            }
          );

          // Notify pharmacists of cancellation
          const pharmacists = await this.pharmacistRepository.find({
            relations: ['user']
          });

          for (const pharm of pharmacists) {
            await this.emailService.sendPharmacyOrderCancellationNotification(
              pharm.user.email,
              pharm.user.firstName,
              {
                id: existingOrder.id,
                patientName: `${existingOrder.prescription.patient.user.firstName} ${existingOrder.prescription.patient.user.lastName}`,
                prescriptionName: existingOrder.prescription.name,
                date: existingOrder.createdAt || new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                cancelledBy: 'patient',
                orderUrl: `${process.env.FRONTEND_URL}/dashboard/pharmacist/orders`
              }
            );
          }
        } catch (error) {
          console.error('Failed to send cancellation emails:', error);
        }
      }

      return cancelledOrder;
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
      const cancelledOrder = await this.pharmacyorderRepository.save(pharmacyorder);

      // Send cancellation emails
      if (existingOrder) {
        try {
          // Email to patient
          await this.emailService.sendPharmacyOrderCancellation(
            existingOrder.prescription.patient.user.email,
            existingOrder.prescription.patient.user.firstName,
            {
              id: existingOrder.id,
              prescriptionName: existingOrder.prescription.name,
              date: existingOrder.createdAt || new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              cancelledBy: 'pharmacist',
              pharmacistName: `${pharmacist.user.firstName} ${pharmacist.user.lastName}`,
              pharmacyName: pharmacist.pharmacyName,
              orderUrl: `${process.env.FRONTEND_URL}/dashboard/patient/orders/new`
            }
          );
        } catch (error) {
          console.error('Failed to send cancellation email:', error);
        }
      }

      return cancelledOrder;
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
