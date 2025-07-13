import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { PharmacyOrder } from "src/pharmacy/pharmacy-order/entities/pharmacy-order.entity";

@Entity()
export class Pharmacist {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User)
    @JoinColumn()
    user: User;

    @Column()
    pharmacyName: string;

    @Column({type: 'varchar', length: '50'})
    licenseNumber: string;

}