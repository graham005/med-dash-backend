import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, Matches } from "class-validator";
import { AppointmentStatus } from "src/enums";

export class CreateAppointmentDto {
    @ApiProperty()
    doctorId: string;

    @ApiProperty({
        description: "Start time of the appointment in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)",
        example: "2024-06-10T14:30:00Z"
    })
    @IsDateString()
    startTime: string;

    @ApiProperty({
        description: "End time of the appointment in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)",
        example: "2024-06-10T14:30:00Z"
    })
    @IsDateString()
    endTime: string;

    @ApiProperty()
    @IsEnum(AppointmentStatus, {
        message: 'Valid status required'
    })
    status: AppointmentStatus = AppointmentStatus.BOOKED

    @ApiProperty()
    availabilitySlotId: string;

    @ApiProperty()
    reasonForVisit: string;
}


