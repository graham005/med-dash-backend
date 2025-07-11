import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { PharmacyOrder } from "src/pharmacy/pharmacy-order/entities/pharmacy-order.entity";

@Entity()
export class Patient {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, {cascade:true})
    @JoinColumn()
    user: User;

    @Column({type: 'date', nullable: true})
    dateOfBirth?: Date;

    @Column({type: 'varchar', length: 20, nullable: true})
    bloodType?: string;

    records: string;

    @OneToMany(() => PharmacyOrder, order => order.patient)
    orders: string;
}