import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PharmacyOrderService } from './pharmacy-order.service';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { UpdatePharmacyOrderDto } from './dto/update-pharmacy-order.dto';

@Controller('pharmacy-order')
export class PharmacyOrderController {
  constructor(private readonly pharmacyOrderService: PharmacyOrderService) {}

  @Post()
  create(@Body() createPharmacyOrderDto: CreatePharmacyOrderDto) {
    return this.pharmacyOrderService.create(createPharmacyOrderDto);
  }

  @Get()
  findAll() {
    return this.pharmacyOrderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmacyOrderService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePharmacyOrderDto: UpdatePharmacyOrderDto) {
    return this.pharmacyOrderService.update(+id, updatePharmacyOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pharmacyOrderService.remove(+id);
  }
}
