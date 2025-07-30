import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested, IsNumber, IsInt, IsOptional, Max, Min } from "class-validator";

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
    date: string; // Keep as string for input validation

    @ApiProperty()
    @IsDateString()
    validityDate: string; // Change to string to match date

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(12)
    refillsAllowed?: number; // This is fine as optional

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
