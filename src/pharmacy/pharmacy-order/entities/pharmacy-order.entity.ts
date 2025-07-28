import { Pharmacist } from "src/users/entities/pharmacist.entity";
import { Prescription } from "../../prescription/entities/prescription.entity";
import { OrderStatus } from "src/enums";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Patient } from "src/users/entities/patient.entity";

@Entity()
export class PharmacyOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Prescription, prescription => prescription.orders, {cascade: true})
    prescription: Prescription;

    @ManyToOne(() => Patient)
    patient: Patient

    @Column()
    totalAmount: number

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default:OrderStatus.PENDING
    })
    status: OrderStatus;

    @Column({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;
}
