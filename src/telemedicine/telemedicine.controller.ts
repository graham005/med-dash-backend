import { Controller } from '@nestjs/common';
import { TelemedicineService } from './telemedicine.service';

@Controller('telemedicine')
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}
}
