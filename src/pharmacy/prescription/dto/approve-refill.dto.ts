import { IsOptional, IsString, MaxLength, IsInt, Min, Max } from 'class-validator';

export class ApproveRefillDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12)
  additionalRefills?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}