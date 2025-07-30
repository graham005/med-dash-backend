import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRefillDto {
  @ApiProperty({ description: 'Reason for rejecting the refill request' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectionNotes: string;
}