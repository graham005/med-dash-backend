import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { User as UserDecorator } from '../../auth/decorators/user.decorator'
import { User } from 'src/users/entities/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums';

@Controller('prescription')
@UseGuards(RolesGuard)
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Roles(UserRole.DOCTOR)
  @Post()
  create(
    @Body() createPrescriptionDto: CreatePrescriptionDto,
    @UserDecorator() user: User
  ) {
    return this.prescriptionService.create(createPrescriptionDto, user);
  }

  @Roles(UserRole.DOCTOR, UserRole.PATIENT)
  @Get()
  findAll(@UserDecorator() user: User) {
    return this.prescriptionService.findAll(user);
  }

  @Roles(UserRole.DOCTOR, UserRole.PATIENT)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.prescriptionService.findOne(id, user);
  }

  @Roles(UserRole.DOCTOR)
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updatePrescriptionDto: UpdatePrescriptionDto,
    @UserDecorator() user: User
  ) {
    return this.prescriptionService.update(id, updatePrescriptionDto, user);
  }

  @Roles(UserRole.DOCTOR)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.prescriptionService.remove(id, user);
  }
}
