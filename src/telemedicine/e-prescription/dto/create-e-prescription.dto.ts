import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, ValidateNested, IsString, IsNotEmpty } from "class-validator";

export class CreateEPrescriptionDto {
    @ApiProperty()
    @IsString()
    consultationId: string;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    pdfUrl: string;

    @ApiProperty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MedicationsDto)
    medications: MedicationsDto[];

}

class MedicationsDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    dosage: string;

    @IsString()
    @IsNotEmpty()
    instructions: string;
}
