import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageContext } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { User } from 'src/users/entities/user.entity';
import { Appointment } from 'src/appointments/entities/appointment.entity';
import { PharmacyOrder } from 'src/pharmacy/pharmacy-order/entities/pharmacy-order.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { Patient } from 'src/users/entities/patient.entity';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(PharmacyOrder)
    private readonly pharmacyOrderRepository: Repository<PharmacyOrder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Pharmacist)
    private readonly pharmacistRepository: Repository<Pharmacist>,
  ) {}

  async createMessage(createMessageDto: CreateMessageDto, sender: User): Promise<MessageResponseDto> {
    // Validate the conversation and participants
    await this.validateConversationAccess(
      createMessageDto.context,
      createMessageDto.conversationId,
      sender.id,
      createMessageDto.receiverId
    );

    const receiver = await this.userRepository.findOne({
      where: { id: createMessageDto.receiverId }
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    const message = this.messageRepository.create({
      ...createMessageDto,
      senderId: sender.id,
      sender,
      receiver,
    });

    // Set the appropriate relationship based on context
    if (createMessageDto.context === MessageContext.APPOINTMENT) {
      const appointment = await this.appointmentRepository.findOne({
        where: { id: createMessageDto.conversationId }
      });
      if (appointment) {
        message.appointment = appointment;
      }
    } else if (createMessageDto.context === MessageContext.PHARMACY_ORDER) {
      const pharmacyOrder = await this.pharmacyOrderRepository.findOne({
        where: { id: createMessageDto.conversationId }
      });
      if (pharmacyOrder) {
        message.pharmacyOrder = pharmacyOrder;
      }
    }

    const savedMessage = await this.messageRepository.save(message);
    
    return this.mapToResponseDto(savedMessage);
  }

  async getConversationMessages(
    context: MessageContext,
    conversationId: string,
    user: User,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: MessageResponseDto[]; total: number; hasMore: boolean }> {
    // Validate user has access to this conversation
    const otherParticipant = await this.validateAndGetOtherParticipant(context, conversationId, user.id);

    const [messages, total] = await this.messageRepository.findAndCount({
      where: {
        context,
        conversationId,
      },
      relations: ['sender', 'receiver'],
      order: { updatedAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Mark messages as read for the current user
    await this.markMessagesAsRead(conversationId, user.id);

    const messageDtos = messages.map(message => this.mapToResponseDto(message));

    return {
      messages: messageDtos,
      total,
      hasMore: total > page * limit,
    };
  }

  async getUserConversations(user: User): Promise<{
    appointments: Array<{
      id: string;
      context: MessageContext;
      participant: { id: string; name: string; role: string };
      appointmentDetails: {
        startTime: Date;
        endTime: Date;
        status: any;
        reasonForVisit: string;
      };
      lastMessage: MessageResponseDto | null;
      unreadCount: number;
      updatedAt: any;
    }>;
    pharmacyOrders: Array<{
      id: string;
      context: MessageContext;
      participant: { id: string; name: string; role: string };
      orderDetails: {
        status: any;
        totalPrice: number;
        prescription: any;
      };
      lastMessage: MessageResponseDto | null;
      unreadCount: number;
      updatedAt: any;
    }>;
  }> {
    const userProfile = await this.getUserProfile(user);

    const conversations: {
      appointments: Array<{
        id: string;
        context: MessageContext;
        participant: { id: string; name: string; role: string };
        appointmentDetails: {
          startTime: Date;
          endTime: Date;
          status: any;
          reasonForVisit: string;
        };
        lastMessage: MessageResponseDto | null;
        unreadCount: number;
        updatedAt: any;
      }>;
      pharmacyOrders: Array<{
        id: string;
        context: MessageContext;
        participant: { id: string; name: string; role: string };
        orderDetails: {
          status: any;
          totalPrice: number;
          prescription: any;
        };
        lastMessage: MessageResponseDto | null;
        unreadCount: number;
        updatedAt: any;
      }>;
    } = {
      appointments: [],
      pharmacyOrders: [],
    };

    if (userProfile.doctor) {
      // Doctor can see conversations from their appointments
      const appointments = await this.appointmentRepository.find({
        where: { doctor: { id: userProfile.doctor.id } },
        relations: ['patient', 'patient.user', 'doctor', 'doctor.user'],
        order: { startTime: 'ASC' },
      });

      conversations.appointments = await Promise.all(
        appointments.map(async (appointment) => {
          const lastMessage = await this.getLastMessage(MessageContext.APPOINTMENT, appointment.id);
          const unreadCount = await this.getUnreadCount(appointment.id, user.id);
          
          return {
            id: appointment.id,
            context: MessageContext.APPOINTMENT,
            participant: {
              id: appointment.patient.user.id,
              name: `${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`,
              role: 'patient',
            },
            appointmentDetails: {
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              status: appointment.status,
              reasonForVisit: appointment.reasonForVisit,
            },
            lastMessage,
            unreadCount,
            updatedAt: lastMessage?.createdAt || appointment.startTime,
          };
        })
      );
    }

    if (userProfile.patient) {
      // Patient can see conversations from their appointments and pharmacy orders
      const appointments = await this.appointmentRepository.find({
        where: { patient: { id: userProfile.patient.id } },
        relations: ['patient', 'patient.user', 'doctor', 'doctor.user'],
        order: { startTime: 'ASC' },
      });

      const pharmacyOrders = await this.pharmacyOrderRepository.find({
        where: { patient: { id: userProfile.patient.id } },
        relations: ['patient', 'patient.user', 'prescription', 'prescription.prescribedBy', 'prescription.prescribedBy.user'],
        order: { createdAt: 'ASC' },
      });

      conversations.appointments = await Promise.all(
        appointments.map(async (appointment) => {
          const lastMessage = await this.getLastMessage(MessageContext.APPOINTMENT, appointment.id);
          const unreadCount = await this.getUnreadCount(appointment.id, user.id);
          
          return {
            id: appointment.id,
            context: MessageContext.APPOINTMENT,
            participant: {
              id: appointment.doctor.user.id,
              name: `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
              role: 'doctor',
            },
            appointmentDetails: {
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              status: appointment.status,
              reasonForVisit: appointment.reasonForVisit,
            },
            lastMessage,
            unreadCount,
            updatedAt: lastMessage?.createdAt || appointment.startTime,
          };
        })
      );

      conversations.pharmacyOrders = await Promise.all(
        pharmacyOrders.map(async (order) => {
          // Find pharmacist for this order (you might need to add a pharmacist relation to PharmacyOrder)
          // For now, we'll get all pharmacists and let the frontend handle the assignment
          const pharmacists = await this.pharmacistRepository.find({
            relations: ['user'],
            take: 1, // Just get one pharmacist for demo
          });
          
          const pharmacist = pharmacists[0];
          const lastMessage = await this.getLastMessage(MessageContext.PHARMACY_ORDER, order.id);
          const unreadCount = await this.getUnreadCount(order.id, user.id);
          
          return {
            id: order.id,
            context: MessageContext.PHARMACY_ORDER,
            participant: {
              id: pharmacist?.user.id,
              name: pharmacist ? `${pharmacist.user.firstName} ${pharmacist.user.lastName}` : 'Pharmacist',
              role: 'pharmacist',
            },
            orderDetails: {
              status: order.status,
              totalPrice: order.totalAmount,
              prescription: order.prescription,
            },
            lastMessage,
            unreadCount,
            updatedAt: lastMessage?.createdAt || order.createdAt,
          };
        })
      );
    }

    if (userProfile.pharmacist) {
      // Pharmacist can see conversations from pharmacy orders
      const pharmacyOrders = await this.pharmacyOrderRepository.find({
        relations: ['patient', 'patient.user', 'prescription'],
        order: { createdAt: 'ASC' },
      });

      conversations.pharmacyOrders = await Promise.all(
        pharmacyOrders.map(async (order) => {
          const lastMessage = await this.getLastMessage(MessageContext.PHARMACY_ORDER, order.id);
          const unreadCount = await this.getUnreadCount(order.id, user.id);
          
          return {
            id: order.id,
            context: MessageContext.PHARMACY_ORDER,
            participant: {
              id: order.patient.user.id,
              name: `${order.patient.user.firstName} ${order.patient.user.lastName}`,
              role: 'patient',
            },
            orderDetails: {
              status: order.status,
              totalPrice: order.totalAmount,
              prescription: order.prescription,
            },
            lastMessage,
            unreadCount,
            updatedAt: lastMessage?.createdAt || order.createdAt,
          };
        })
      );
    }

    return conversations;
  }

  private async validateConversationAccess(
    context: MessageContext,
    conversationId: string,
    senderId: string,
    receiverId: string
  ): Promise<void> {
    if (context === MessageContext.APPOINTMENT) {
      const appointment = await this.appointmentRepository.findOne({
        where: { id: conversationId },
        relations: ['doctor', 'doctor.user', 'patient', 'patient.user'],
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      const validParticipants = [appointment.doctor.user.id, appointment.patient.user.id];
      
      if (!validParticipants.includes(senderId) || !validParticipants.includes(receiverId)) {
        throw new ForbiddenException('Access denied to this conversation');
      }
    } else if (context === MessageContext.PHARMACY_ORDER) {
      const pharmacyOrder = await this.pharmacyOrderRepository.findOne({
        where: { id: conversationId },
        relations: ['patient', 'patient.user'],
      });

      if (!pharmacyOrder) {
        throw new NotFoundException('Pharmacy order not found');
      }

      // Validate sender is either the patient or a pharmacist
      const senderProfile = await this.getUserProfile({ id: senderId } as User);
      const receiverProfile = await this.getUserProfile({ id: receiverId } as User);

      const isValidConversation = 
        (senderProfile.patient?.id === pharmacyOrder.patient.id && receiverProfile.pharmacist) ||
        (senderProfile.pharmacist && receiverProfile.patient?.id === pharmacyOrder.patient.id);

      if (!isValidConversation) {
        throw new ForbiddenException('Access denied to this conversation');
      }
    }
  }

  private async validateAndGetOtherParticipant(
    context: MessageContext,
    conversationId: string,
    userId: string
  ): Promise<User> {
    if (context === MessageContext.APPOINTMENT) {
      const appointment = await this.appointmentRepository.findOne({
        where: { id: conversationId },
        relations: ['doctor', 'doctor.user', 'patient', 'patient.user'],
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      const validParticipants = [appointment.doctor.user.id, appointment.patient.user.id];
      
      if (!validParticipants.includes(userId)) {
        throw new ForbiddenException('Access denied to this conversation');
      }

      return userId === appointment.doctor.user.id ? appointment.patient.user : appointment.doctor.user;
    } else if (context === MessageContext.PHARMACY_ORDER) {
      const pharmacyOrder = await this.pharmacyOrderRepository.findOne({
        where: { id: conversationId },
        relations: ['patient', 'patient.user'],
      });

      if (!pharmacyOrder) {
        throw new NotFoundException('Pharmacy order not found');
      }

      const userProfile = await this.getUserProfile({ id: userId } as User);
      
      if (userProfile.patient?.id === pharmacyOrder.patient.id) {
        // User is the patient, return a pharmacist (you might want to implement proper pharmacist assignment)
        const pharmacists = await this.pharmacistRepository.find({
          relations: ['user'],
          take: 1,
        });
        const pharmacist = pharmacists[0];
        if (pharmacist?.user) {
          return pharmacist.user;
        } else {
          throw new NotFoundException('Pharmacist not found');
        }
      } else if (userProfile.pharmacist) {
        // User is a pharmacist, return the patient
        return pharmacyOrder.patient.user;
      } else {
        throw new ForbiddenException('Access denied to this conversation');
      }
    }
    throw new NotFoundException('Invalid conversation context');
  }

  private async getUserProfile(user: User): Promise<{
    doctor?: Doctor;
    patient?: Patient;
    pharmacist?: Pharmacist;
  }> {
    const [doctor, patient, pharmacist] = await Promise.all([
      this.doctorRepository.findOne({ where: { user: { id: user.id } }, relations: ['user'] }),
      this.patientRepository.findOne({ where: { user: { id: user.id } }, relations: ['user'] }),
      this.pharmacistRepository.findOne({ where: { user: { id: user.id } }, relations: ['user'] }),
    ]);

    return {
      doctor: doctor ?? undefined,
      patient: patient ?? undefined,
      pharmacist: pharmacist ?? undefined,
    };
  }

  private async getLastMessage(context: MessageContext, conversationId: string): Promise<MessageResponseDto | null> {
    const message = await this.messageRepository.findOne({
      where: { context, conversationId },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
    });

    return message ? this.mapToResponseDto(message) : null;
  }

  private async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    return this.messageRepository.count({
      where: {
        conversationId,
        receiverId: userId,
        isRead: false,
      },
    });
  }

  private async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await this.messageRepository.update(
      {
        conversationId,
        receiverId: userId,
        isRead: false,
      },
      { isRead: true }
    );
  }

  private mapToResponseDto(message: Message): MessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      context: message.context,
      conversationId: message.conversationId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      receiverName: `${message.receiver.firstName} ${message.receiver.lastName}`,
      isRead: message.isRead,
      metadata: message.metadata,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}