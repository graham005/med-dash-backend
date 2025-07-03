import { User } from "src/users/entities/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Auth {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    token: string;

    @ManyToOne(() => User)
    user: User;

    @Column({type: 'timestamp'})
    expiresAt: Date;

    @Column({nullable: true})
    isRevoked: boolean;
}
