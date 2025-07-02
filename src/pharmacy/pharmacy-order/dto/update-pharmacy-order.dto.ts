import { PartialType } from '@nestjs/mapped-types';
import { CreatePharmacyOrderDto } from './create-pharmacy-order.dto';

export class UpdatePharmacyOrderDto extends PartialType(CreatePharmacyOrderDto) {}
