import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EMSStatus } from 'src/enums';

export class UpdateStatusDto {
  @ApiProperty({ enum: EMSStatus, description: 'EMS request status' })
  @IsEnum(EMSStatus)
  status: EMSStatus;

  @ApiProperty({ description: 'Status update notes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}