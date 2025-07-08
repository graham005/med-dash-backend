import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsString } from "class-validator";

export class CreateMedicineDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    dosage: string;

    @ApiProperty()
    @IsNumber()
    price: number;

    @ApiProperty()
    @IsNumber()
    stock: number;

    @ApiProperty()
    @IsString()
    manufacturer: string;

    @ApiProperty()
    @IsDateString()
    expirationDate: Date;
}
