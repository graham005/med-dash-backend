import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AppointmentStatus, UserRole } from 'src/enums';
import { User as UserDecorator } from '../auth/decorators/user.decorator'
import { User } from 'src/users/entities/user.entity';
import { AtGuard } from 'src/auth/guards/at.guard';

@Controller('appointments')
@UseGuards(AtGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) { }

  @Roles(UserRole.PATIENT)
  @Post()
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @UserDecorator() user: any,
  ) {
    return this.appointmentsService.create(createAppointmentDto, user);
  }

  @Roles(UserRole.DOCTOR)
  @Get('/doctor')
  findAllforDoctor(@UserDecorator() user: User) {
    return this.appointmentsService.findAllforDoctor(user);
  }
  @Roles(UserRole.PATIENT)
  @Get('patient')
  findAll(@UserDecorator() user: any) {
    return this.appointmentsService.findAll(user);
  }

  @Roles(UserRole.PATIENT)
  @Get(':id')
  findOne(@Param('id') id: string, @UserDecorator() user: User) {
    return this.appointmentsService.findOne(+id, user);
  }

  @Roles(UserRole.DOCTOR)
  @Get('doctor/:id')
  findOneforDoctor(@Param('id') id: string, @UserDecorator() user: User) {
    return this.appointmentsService.findOneforDoctor(id, user)
  }

  @Roles(UserRole.PATIENT)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @UserDecorator() user: User
  ) {
    return this.appointmentsService.update(+id, updateAppointmentDto, user);
  }

  @Roles(UserRole.DOCTOR)
  @Patch('doctor/:id/status')
  updateStatusByDoctor(
    @Param('id') id: string,
    @Body('status') status: AppointmentStatus,
    @UserDecorator() user: User
  ) {
    return this.appointmentsService.updateStatusForDoctor(id, status, user);
  }

  @Roles(UserRole.PATIENT, UserRole.DOCTOR)
  @Delete(':id')
  remove(@Param('id') id: string, @UserDecorator() user: User) {
    return this.appointmentsService.remove(+id, user);
  }

}


