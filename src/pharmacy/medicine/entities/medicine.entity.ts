import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Medicine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    dosage: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column()
    stock: number;

    @Column()
    manufacturer: string;
}