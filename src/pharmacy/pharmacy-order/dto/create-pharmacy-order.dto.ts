import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsString } from "class-validator";
import { OrderStatus } from "src/enums";
import { Prescription } from "src/pharmacy/prescription/entities/prescription.entity";
import { Pharmacist } from "src/users/entities/pharmacist.entity";

export class CreatePharmacyOrderDto {
    @ApiProperty()
    @IsString()
    prescriptionId: string;

    @ApiProperty()
    @IsNumber()
    totalAmount: number;

    @ApiProperty()
    @IsEnum(OrderStatus, {
        message: 'Valid Order Status Required'
    })
    status: OrderStatus = OrderStatus.PENDING
}
