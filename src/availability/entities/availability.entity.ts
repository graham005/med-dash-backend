import { SlotType } from "src/enums";
import { Doctor } from "src/users/entities/doctor.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class AvailabilitySlot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Doctor, doctor => doctor.availability,{cascade: true} )
    doctor: Doctor;

    @Column({type: 'timestamp'})
    startTime: Date;

    @Column({type: 'timestamp'})
    endTime: Date;
    
    @Column()
    isBooked: boolean;

    @Column({
        type: 'enum',
        enum: SlotType,
        default: SlotType.STANDARD
    })
    type: SlotType;
}