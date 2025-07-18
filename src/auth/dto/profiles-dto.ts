import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsInt, IsNumber, IsString, Matches } from "class-validator";

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

    @ApiProperty()
    @IsInt()
    yearsOfExperience: number

    @ApiProperty()
    @IsString()
    hospitalAffiliation: string


}

export class PharmacistDto {
    @ApiProperty()
    @IsString()
    pharmacyName: string;

    @ApiProperty()
    @IsString()
    licenseNumber: string;
}

export class AdminDto {
    @ApiProperty()
    @IsString()
    department: string;

}

export class UpdatePatientDto extends PartialType(PatientDto) { }
export class UpdateDoctorDto extends PartialType(DoctorDto) { }
export class UpdatePharmacistDto extends PartialType(PharmacistDto) { }
export class UpdateAdminDto extends PartialType(AdminDto) {
  @ApiProperty({ required: false })
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsString()
  email?: string;

}

