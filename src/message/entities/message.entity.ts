import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Appointment } from 'src/appointments/entities/appointment.entity';
import { PharmacyOrder } from 'src/pharmacy/pharmacy-order/entities/pharmacy-order.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  PRESCRIPTION = 'prescription',
  SYSTEM = 'system'
}

export enum MessageContext {
  APPOINTMENT = 'appointment',
  PHARMACY_ORDER = 'pharmacy_order'
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'receiverId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessageContext,
  })
  context: MessageContext;

  @Column({ name: 'conversation_id' })
  conversationId: string; // appointment.id or pharmacy_order.id

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'receiver_id' })
  receiverId: string;

  @ManyToOne(() => User, { eager: true })
  sender: User;

  @ManyToOne(() => User, { eager: true })
  receiver: User;

  @ManyToOne(() => Appointment, { nullable: true })
  appointment?: Appointment;

  @ManyToOne(() => PharmacyOrder, { nullable: true })
  pharmacyOrder?: PharmacyOrder;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'text', nullable: true })
  metadata?: string; // JSON string for additional data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
