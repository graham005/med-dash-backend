import { Consultation } from "src/telemedicine/consultation/entities/consultation.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class EPrescription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Consultation)
    consultation: Consultation;

    @Column()
    pdfUrl: string;

    @Column({type: 'jsonb'})
    medication: Array<{
        name: string;
        dosage: string;
        instructions: string;
    }>

    @Column({type: 'timestamp'})
    issuedAt: Date;
}