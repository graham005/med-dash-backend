import { ConsultationStatus } from "src/enums";
import { Doctor } from "src/users/entities/doctor.entity";
import { Patient } from "src/users/entities/patient.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Consultation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Doctor)
    doctor: Doctor;

    @ManyToOne(() => Patient)
    patient:Patient;

    @Column({type: 'timestamp'})
    startTime: Date;

    @Column({type: 'timestamp', nullable: true})
    endTime?: Date;

    @Column()
    meetingUrl: string;

    @Column({
        type: 'enum',
        enum: ConsultationStatus,
        default: ConsultationStatus.SCHEDULED
    })
    status: ConsultationStatus
}