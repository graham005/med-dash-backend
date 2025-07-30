import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestRefillDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}