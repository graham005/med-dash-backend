import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { EMSStatus, EmergencyType, Priority } from 'src/enums';

@Entity('ems_requests')
export class EMSRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  patient: User;

  @ManyToOne(() => User, { nullable: true })
  paramedic: User;

  @Column('float')
  patientLat: number;

  @Column('float')
  patientLng: number;

  @Column('float', { nullable: true })
  paramedicLat: number;

  @Column('float', { nullable: true })
  paramedicLng: number;

  @Column({
    type: 'enum',
    enum: EMSStatus,
    default: EMSStatus.PENDING
  })
  status: EMSStatus;

  @Column({
    type: 'enum',
    enum: EmergencyType
  })
  emergencyType: EmergencyType;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM
  })
  priority: Priority;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  contactNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  dispatchTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  arrivalTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  completionTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
