import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsString, Matches } from "class-validator";

export class PatientDto {
    @ApiProperty()
    @IsDateString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
    dateOfBirth: string;

    @ApiProperty()
    @IsString()
    bloodType: string;

}

export class DoctorDto {
    @ApiProperty()
    @IsString()
    specialization: string;

    @ApiProperty()
    @IsString()
    qualification: string;

    @ApiProperty()
    @IsString()
    licenseNumber: string;

}

export class PharmacistDto {
    @ApiProperty()
    @IsString()
    pharmacyName: string;

    @ApiProperty()
    @IsString()
    licenceNumber: string;
}

export class AdminDto {
    @ApiProperty()
    @IsString()
    department: string;

}

