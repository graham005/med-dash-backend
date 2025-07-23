import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsLatitude, IsLongitude, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmergencyType, Priority } from 'src/enums';

export class CreateEmsRequestDto {
  @ApiProperty({ description: 'Patient latitude coordinate' })
  @IsNumber()
  @IsLatitude()
  lat: number;

  @ApiProperty({ description: 'Patient longitude coordinate' })
  @IsNumber()
  @IsLongitude()
  lng: number;

  @ApiProperty({ enum: EmergencyType, description: 'Type of emergency' })
  @IsEnum(EmergencyType)
  emergencyType: EmergencyType;

  @ApiProperty({ enum: Priority, description: 'Emergency priority level' })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({ description: 'Additional emergency details', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Patient phone number for contact', required: false })
  @IsOptional()
  @IsString()
  contactNumber?: string;
}