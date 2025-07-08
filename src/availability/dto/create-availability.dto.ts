import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional } from "class-validator";
import { SlotType } from "src/enums";

export class CreateAvailabilitySlotDto {
    @ApiProperty({
        description: "Start time of the appointment in ISO 8601 format",
        example: "2024-06-10T14:30:00.000Z"
    })
    @IsDateString()
    startTime: string;

    @ApiProperty({
        description: "End time of the appointment in ISO 8601 format",
        example: "2024-06-10T15:30:00.000Z"
    })
    @IsDateString()
    endTime: string;

    @ApiProperty({
        description: "Type of availability slot",
        enum: SlotType,
        default: SlotType.STANDARD
    })
    @IsEnum(SlotType, {
        message: 'Valid type required'
    })
    @IsOptional()
    type: SlotType = SlotType.STANDARD
}