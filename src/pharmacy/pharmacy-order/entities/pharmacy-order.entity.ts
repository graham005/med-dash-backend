import { Pharmacist } from "src/users/entities/pharmacist.entity";
import { Prescription } from "../../prescription/entities/prescription.entity";
import { OrderStatus } from "src/enums";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PharmacyOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Pharmacist)
    pharmacist: Pharmacist;

    @ManyToOne(() => Prescription, prescription => prescription.orders)
    prescription: Prescription;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default:OrderStatus.PENDING
    })
    status: OrderStatus;

    @Column({type: 'timestamp'})
    createdAt: Date;
}
