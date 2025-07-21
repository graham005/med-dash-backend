import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { User as UserDecorator} from '../../auth/decorators/user.decorator'
import { User } from 'src/users/entities/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums';

@Controller('medicine')
@UseGuards(RolesGuard)
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  @Roles(UserRole.PHARMACIST)
  @Post()
  create(
    @Body() createMedicineDto: CreateMedicineDto,
    @UserDecorator() user: User
  ) {
    return this.medicineService.create(createMedicineDto, user);
  }

  @Roles(UserRole.PHARMACIST, UserRole.DOCTOR, UserRole.PATIENT)
  @Get()
  findAll() {
    return this.medicineService.findAll();
  }

  @Roles(UserRole.PHARMACIST)
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.medicineService.findOne(id);
  }

  @Roles(UserRole.PHARMACIST, UserRole.PATIENT)
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateMedicineDto: UpdateMedicineDto,
  ) {
    return this.medicineService.update(id, updateMedicineDto);
  }

  @Roles(UserRole.PHARMACIST)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.medicineService.remove(id, user);
  }
}
