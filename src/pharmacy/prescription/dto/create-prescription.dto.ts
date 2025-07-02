import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested } from "class-validator";

export class CreatePrescriptionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    patient: string;

    @IsDateString()
    date: string;

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
