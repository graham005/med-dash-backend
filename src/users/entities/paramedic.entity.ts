import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Paramedic {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, { cascade: true })
    @JoinColumn()
    user: User;

    @Column()
    ambulanceId: string;

    @Column({ type: 'varchar', length: 50 })
    licenseNumber: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    station?: string;
}