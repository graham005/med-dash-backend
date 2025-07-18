import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Appointment } from 'src/appointments/entities/appointment.entity';
import { PharmacyOrder } from 'src/pharmacy/pharmacy-order/entities/pharmacy-order.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentType {
  APPOINTMENT = 'appointment',
  PHARMACY_ORDER = 'pharmacy_order'
}

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column()
  email: string;

  @Column()
  phoneNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentType
  })
  type: PaymentType;

  @Column({ unique: true })
  paystackReference: string;

  @Column({ nullable: true })
  paystackAccessCode: string;

  @Column({ nullable: true })
  paystackAuthorizationUrl: string;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @ManyToOne(() => Appointment, { nullable: true })
  appointment?: Appointment;

  @ManyToOne(() => PharmacyOrder, { nullable: true })
  pharmacyOrder?: PharmacyOrder;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
