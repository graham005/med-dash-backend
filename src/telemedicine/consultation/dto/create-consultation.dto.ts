import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsString, Matches } from "class-validator";
import { ConsultationStatus } from "src/enums";

export class CreateConsultationDto {
    @ApiProperty()
    @IsString()
    doctorId: string;
    
    @ApiProperty({
        description: "Start time of the appointment in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)",
        example: "2024-06-10T14:30:00Z"
    })
    @IsDateString()
    @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, {
        message: "startTime must be in the format YYYY-MM-DDTHH:mm:ssZ"
    })
    startTime: string;

    @ApiProperty({
        description: "End time of the appointment in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)",
        example: "2024-06-10T14:30:00Z"
    })
    @IsDateString()
    @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, {
        message: "endTime must be in the format YYYY-MM-DDTHH:mm:ssZ"
    })
    endTime: string;

    @ApiProperty()
    @IsString()
    meetingUrl: string;

    @ApiProperty()
    @IsEnum([ConsultationStatus], {
        message: 'Valid status required'
    })
    status: ConsultationStatus = ConsultationStatus.SCHEDULED
}
