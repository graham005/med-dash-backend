import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

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
}