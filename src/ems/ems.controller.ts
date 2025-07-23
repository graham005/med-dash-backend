import { Controller, Post, Body, Param, Patch, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EMSService } from './ems.service';
import { User } from 'src/users/entities/user.entity';
import { User as UserDecorator } from 'src/auth/decorators/user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/enums';
import { CreateEmsRequestDto } from './dto/create-ems-request.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('EMS')
@Controller('ems')
@UseGuards(RolesGuard)
export class EMSController {
  constructor(private readonly emsService: EMSService) {}

  @Post('request')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Create EMS request' })
  @ApiResponse({ status: 201, description: 'EMS request created successfully' })
  async requestEMS(
    @UserDecorator() user: User,
    @Body() createDto: CreateEmsRequestDto
  ) {
    return this.emsService.createRequest(createDto, user);
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.PARAMEDIC)
  @ApiOperation({ summary: 'Get all active EMS requests' })
  async getActiveRequests() {
    return this.emsService.getActiveRequests();
  }

  @Get('my-requests')
  @Roles(UserRole.PATIENT, UserRole.PARAMEDIC)
  @ApiOperation({ summary: 'Get user EMS requests' })
  async getMyRequests(@UserDecorator() user: User) {
    return this.emsService.getUserRequests(user);
  }

  @Patch(':id/location')
  @Roles(UserRole.PARAMEDIC)
  @ApiOperation({ summary: 'Update paramedic location' })
  async updateParamedicLocation(
    @Param('id') requestId: string,
    @UserDecorator() user: User,
    @Body() updateDto: UpdateLocationDto
  ) {
    return this.emsService.updateParamedicLocation(requestId, user, updateDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.PARAMEDIC, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update EMS request status' })
  async updateStatus(
    @Param('id') requestId: string,
    @UserDecorator() user: User,
    @Body() updateDto: UpdateStatusDto
  ) {
    return this.emsService.updateStatus(requestId, updateDto, user);
  }

 

  @Post(':id/assign/:paramedicId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually assign paramedic to request' })
  async assignParamedic(
    @Param('id') requestId: string,
    @Param('paramedicId') paramedicId: string
  ) {
    return this.emsService.assignParamedic(requestId, paramedicId);
  }

  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.PARAMEDIC, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get EMS request by ID' })
  async getEMSRequest(@Param('id') requestId: string) {
    return this.emsService.getRequest(requestId);
  }
}
