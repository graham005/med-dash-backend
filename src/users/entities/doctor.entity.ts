import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { AvailabilitySlot } from "src/availability/entities/availability.entity";

@Entity()
export class Doctor {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User)
    @JoinColumn()
    user: User;

    @Column()
    specialization: string;

    @Column({type: 'text', nullable: true})
    qualification: string;

    @Column({type: 'varchar', length: '50'})
    licenceNumber: string;

    @OneToMany(() => AvailabilitySlot, slot => slot.doctor)
    availability: AvailabilitySlot;
}