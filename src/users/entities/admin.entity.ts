import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Admin {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, {cascade:true})
    @JoinColumn()
    user: User;

    @Column()
    department: string;

    @Column({type: 'boolean', default: false})
    isSuperAdmin?: boolean;
    
    auditlogs: string;
}