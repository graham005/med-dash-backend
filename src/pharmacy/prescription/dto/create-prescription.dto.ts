import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested, IsNumber } from "class-validator";

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
    @IsDateString()
    validityDate: Date;

    @ApiProperty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MedicationsDto)
    medications: MedicationsDto[];
}

class MedicationsDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    medicineId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    dosage: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    frequency: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    duration: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number
}
