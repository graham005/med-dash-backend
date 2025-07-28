import { AppointmentStatus } from "src/enums";
import { Doctor } from "src/users/entities/doctor.entity";
import { Patient } from "src/users/entities/patient.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AvailabilitySlot } from "src/availability/entities/availability.entity";

@Entity()
export class Appointment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Patient)
    patient: Patient;

    @ManyToOne(() => Doctor)
    doctor: Doctor;

    
    @Column({type: 'timestamp'})
    startTime: Date;
    
    @Column({type: 'timestamp'})
    endTime: Date;
    
    @Column({
        type: 'enum',
        enum: AppointmentStatus,
        default: AppointmentStatus.BOOKED
    })
    status: AppointmentStatus;

    @Column()
    reasonForVisit: string;

    @Column({nullable: true})
    meetingUrl?: string;
    
    @ManyToOne(() => AvailabilitySlot, {cascade: true})
    availabilitySlot: AvailabilitySlot;
}
