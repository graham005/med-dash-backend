import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNumber, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  phoneNumber: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  type: PaymentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  pharmacyOrderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
