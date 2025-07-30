import { Medicine } from "src/pharmacy/medicine/entities/medicine.entity";
import { PharmacyOrder } from "src/pharmacy/pharmacy-order/entities/pharmacy-order.entity";
import { Doctor } from "src/users/entities/doctor.entity";
import { Patient } from "src/users/entities/patient.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export enum PrescriptionStatus {
    ACTIVE = 'active',
    FULFILLED = 'fulfilled',
    REFILL_REQUESTED = 'refill_requested',
    REFILL_APPROVED = 'refill_approved',
    EXPIRED = 'expired'
}

@Entity()
export class Prescription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @ManyToOne(() => Doctor)
    prescribedBy: Doctor;

    @ManyToOne(() => Patient)
    patient: Patient;

    @Column({ type: 'timestamp' })
    date: Date;

    @Column({
        type: 'enum',
        enum: PrescriptionStatus,
        default: PrescriptionStatus.ACTIVE
    })
    status: PrescriptionStatus;

    @Column({ type: 'int', default: 0 })
    refillsAllowed: number;

    @Column({ type: 'int', default: 0 })
    refillsUsed: number;

    @Column({ type: 'timestamp', nullable: true })
    lastRefillDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    refillRequestedAt: Date | null;

    @Column({ type: 'text', nullable: true })
    refillRequestNotes: string | null;

    @Column()
    validityDate: Date;

    @Column({ type: 'jsonb' })
    medications: Array<{
        medicineId: Medicine["id"];
        dosage: Medicine["dosage"]
        frequency: string;
        duration: string;
        quantity: number;
    }>

    @OneToMany(() => PharmacyOrder, order => order.prescription)
    orders: PharmacyOrder[];

    get canBeRefilled(): boolean {
        return this.status === PrescriptionStatus.ACTIVE &&
            this.refillsUsed < this.refillsAllowed;
    }

    get canBeOrdered(): boolean {
        return this.status === PrescriptionStatus.ACTIVE ||
            this.status === PrescriptionStatus.REFILL_APPROVED;
    }
}