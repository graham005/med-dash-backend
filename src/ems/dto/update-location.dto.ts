import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsLatitude, IsLongitude } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  @IsLatitude()
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  @IsLongitude()
  lng: number;
}