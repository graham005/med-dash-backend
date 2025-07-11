import { Medicine } from "src/pharmacy/medicine/entities/medicine.entity";
import { PharmacyOrder } from "src/pharmacy/pharmacy-order/entities/pharmacy-order.entity";
import { Doctor } from "src/users/entities/doctor.entity";
import { Patient } from "src/users/entities/patient.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

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

    @Column({type: 'timestamp'})
    date: Date;

    @Column()
    validityDate: Date;

    @Column({type: 'jsonb'})
    medications: Array<{
        medicineId: Medicine["id"];
        dosage: Medicine["dosage"]
        frequency: string;
        duration: string;
        quantity: number;
    }>

    @OneToMany(() => PharmacyOrder, order => order.prescription)
    orders: PharmacyOrder[];
}