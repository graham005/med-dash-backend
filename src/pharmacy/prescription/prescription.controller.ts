import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { RequestRefillDto } from './dto/request-refill.dto';
import { ApproveRefillDto } from './dto/approve-refill.dto';
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

  // New refill endpoints
  @Roles(UserRole.PATIENT)
  @Post(':id/request-refill')
  requestRefill(
    @Param('id') id: string,
    @Body() requestRefillDto: RequestRefillDto,
    @UserDecorator() user: User
  ) {
    return this.prescriptionService.requestRefill(id, requestRefillDto, user);
  }

  @Roles(UserRole.DOCTOR)
  @Put(':id/approve-refill')
  approveRefill(
    @Param('id') id: string,
    @Body() approveRefillDto: ApproveRefillDto,
    @UserDecorator() user: User
  ) {
    return this.prescriptionService.approveRefill(id, approveRefillDto, user);
  }

  @Roles(UserRole.DOCTOR)
  @Put(':id/reject-refill')
  rejectRefill(
    @Param('id') id: string,
    @Body() body: { rejectionNotes: string },
    @UserDecorator() user: User
  ) {
    return this.prescriptionService.rejectRefill(id, body.rejectionNotes, user);
  }

  @Roles(UserRole.DOCTOR)
  @Get('pending-refills')
  getPendingRefillRequests(@UserDecorator() user: User) {
    return this.prescriptionService.getPendingRefillRequests(user);
  }

  @Roles(UserRole.PATIENT)
  @Get('refill-history')
  getPatientRefillHistory(@UserDecorator() user: User) {
    return this.prescriptionService.getPatientRefillHistory(user);
  }

  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @Get(':id/validate-for-order')
  validatePrescriptionForOrder(@Param('id') id: string) {
    return this.prescriptionService.validatePrescriptionForOrder(id);
  }
}
