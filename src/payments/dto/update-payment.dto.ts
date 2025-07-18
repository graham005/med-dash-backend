import { PartialType } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payment.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiProperty({ enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
