import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested } from "class-validator";

export class CreatePrescriptionDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    patientId: string;

    @ApiProperty()
    @IsDateString()
    date: string;

    @ApiProperty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MedicationsDto)
    medications: MedicationsDto[];
}

class MedicationsDto {
    @IsString()
    @IsNotEmpty()
    medicineId: string;

    @IsString()
    @IsNotEmpty()
    dosage: string;

    @IsString()
    @IsNotEmpty()
    frequency: string;

    @IsString()
    @IsNotEmpty()
    duration: string;
}
