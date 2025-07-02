import { Column, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

export class Admin {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User)
    @JoinColumn()
    user: User;

    @Column()
    department: string;

    @Column({type: 'boolean', default: false})
    isSuperAdmin?: boolean;
    
    auditlogs: string;
}