import { Pharmacist } from "src/users/entities/pharmacist.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Medicine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    dosage: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    }})
    price: number;

    @Column()
    stock: number;

    @Column()
    manufacturer: string;

    @Column()
    expirationDate: Date;

    @ManyToOne(() => Pharmacist, {cascade: true})
    addedBy: Pharmacist;
}