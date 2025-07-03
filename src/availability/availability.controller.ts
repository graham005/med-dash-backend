import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilitySlotDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { User as UserDecorator} from '../auth/decorators/user.decorator'
import { User } from 'src/users/entities/user.entity';

@Controller('availability')
@UseGuards(RolesGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Roles(UserRole.DOCTOR)
  @Post()
  create(
    @Body() createAvailabilityDto: CreateAvailabilitySlotDto,
    @UserDecorator() user : User
  ) {
    return this.availabilityService.create(createAvailabilityDto, user);
  }

  @Roles(UserRole.DOCTOR)
  @Get()
  findAll(@UserDecorator() user: User) {
    return this.availabilityService.findAll(user);
  }

  @Roles(UserRole.DOCTOR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.availabilityService.findOne(+id);
  }

  @Roles(UserRole.DOCTOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAvailabilityDto: UpdateAvailabilityDto) {
    return this.availabilityService.update(+id, updateAvailabilityDto);
  }

  @Roles(UserRole.DOCTOR)
  @Delete(':id')
  remove(@Param('id') id: string, @UserDecorator() user: User) {
    return this.availabilityService.remove(+id, user);
  }
}
