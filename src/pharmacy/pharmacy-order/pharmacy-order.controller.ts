import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PharmacyOrderService } from './pharmacy-order.service';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { UpdatePharmacyOrderDto } from './dto/update-pharmacy-order.dto';
import { User as UserDecorator } from '../../auth/decorators/user.decorator'
import { User } from 'src/users/entities/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums';

@Controller('pharmacy-order')
@UseGuards(RolesGuard)
export class PharmacyOrderController {
  constructor(private readonly pharmacyOrderService: PharmacyOrderService) {}

  @Post()
  @Roles(UserRole.PATIENT)
  create(
    @Body() createPharmacyOrderDto: CreatePharmacyOrderDto,
    @UserDecorator() user: User
  ) {
    return this.pharmacyOrderService.create(createPharmacyOrderDto, user);
  }

  @Get()
  @Roles(UserRole.PHARMACIST, UserRole.PATIENT)
  findAll(@UserDecorator() user: User) {
    return this.pharmacyOrderService.findAll(user);
  }

  @Get(':id')
  @Roles(UserRole.PHARMACIST, UserRole.PATIENT)
  findOne(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.pharmacyOrderService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PHARMACIST, UserRole.PATIENT)
  update(
    @Param('id') id: string, 
    @Body() updatePharmacyOrderDto: UpdatePharmacyOrderDto,
    @UserDecorator() user: User
  ) {
    return this.pharmacyOrderService.update(id, updatePharmacyOrderDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PHARMACIST, UserRole.PATIENT)
  remove(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.pharmacyOrderService.remove(id, user);
  }
}
