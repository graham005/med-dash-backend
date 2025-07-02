import { PartialType } from '@nestjs/swagger';
import { CreateAvailabilitySlotDto } from './create-availability.dto';

export class UpdateAvailabilityDto extends PartialType(CreateAvailabilitySlotDto) {}
