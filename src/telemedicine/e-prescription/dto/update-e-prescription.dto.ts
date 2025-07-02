import { PartialType } from '@nestjs/mapped-types';
import { CreateEPrescriptionDto } from './create-e-prescription.dto';

export class UpdateEPrescriptionDto extends PartialType(CreateEPrescriptionDto) {}
