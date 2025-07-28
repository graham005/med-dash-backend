import { UserRole, UserStatus } from "src/enums";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({unique: true})
    email: string;

    @Column()
    passwordHash: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.PATIENT
    })
    userRole: UserRole;

    @Column({nullable: true})
    phoneNumber?: string;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.PENDING
    })
    userStatus: UserStatus

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;

    @Column({ nullable: true })
    resetPasswordToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    resetPasswordExpires?: Date;
}

