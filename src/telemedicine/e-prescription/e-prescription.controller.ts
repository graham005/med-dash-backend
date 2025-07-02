import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EPrescriptionService } from './e-prescription.service';
import { CreateEPrescriptionDto } from './dto/create-e-prescription.dto';
import { UpdateEPrescriptionDto } from './dto/update-e-prescription.dto';

@Controller('e-prescription')
export class EPrescriptionController {
  constructor(private readonly ePrescriptionService: EPrescriptionService) {}

  @Post()
  create(@Body() createEPrescriptionDto: CreateEPrescriptionDto) {
    return this.ePrescriptionService.create(createEPrescriptionDto);
  }

  @Get()
  findAll() {
    return this.ePrescriptionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ePrescriptionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEPrescriptionDto: UpdateEPrescriptionDto) {
    return this.ePrescriptionService.update(+id, updateEPrescriptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ePrescriptionService.remove(+id);
  }
}
