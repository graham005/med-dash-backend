import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { User as UserDecorator } from '../auth/decorators/user.decorator'
import { PatientDto, DoctorDto, PharmacistDto, AdminDto, UpdatePatientDto } from './dto/profiles-dto';
import { Public } from './decorators/public.decorator';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from 'src/enums';
import { Roles } from './decorators/roles.decorator';
import { User } from 'src/users/entities/user.entity';

@Controller('auth')
@UseGuards(RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('signin')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Public()
  @Post('signup')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto)
  }

 
  @Roles(UserRole.PHARMACIST, UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
  @Get('signout/:id')
  signOut(
    @UserDecorator() user: User
  ) {
    return this.authService.signOut(user);
  }

  @Roles(UserRole.PHARMACIST, UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
  @Get('refresh')
  refreshToken(
    @UserDecorator() user: User,
    @Query('refreshToken') refreshToken: string
  ) {
    return this.authService.refreshToken(user, user.id, refreshToken);
  }

  @Roles(UserRole.PHARMACIST, UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
  @Patch('change-password')
  changePassword(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.changePassword(+id, updateAuthDto);
  }

  @Roles(UserRole.PATIENT)
  @Post('patient/profile')
  createPatientProfile(
    @UserDecorator() user: User,
    @Body()
    patientDto: PatientDto,
  ) {
    return this.authService.createPatientProfile(
      user,
      patientDto,
    )
  }

  @Roles(UserRole.DOCTOR)
  @Post('doctor/profile')
  createDoctorProfile(
    @UserDecorator() user: User,
    @Body()
    doctorDto: DoctorDto,
  ) {
    return this.authService.createDoctorProfile(
      user,
      doctorDto,
      //adminDto
    )
  }

  @Roles(UserRole.PHARMACIST)
  @Post('pharmacist/profile')
  createPharmacistProfile(
    @UserDecorator() user: User,
    @Body()
    pharmacistDto: PharmacistDto,
  ) {
    return this.authService.createPharmacistProfile(
      user,
      pharmacistDto,
    )
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/profile')
  createAdminProfile(
    @UserDecorator() user: User,
    @Body()
    adminDto: AdminDto
  ) {
    return this.authService.createAdminProfile(
      user,
      adminDto,
    )
  }

  @Patch('patient/profile/:id')
  updatePatientProfile(
    @Param('id') id: string,
    @UserDecorator() user: User,
    @Body() updatePatientDto: UpdatePatientDto
  ): Promise<any> {
    return this.authService.updatePatientProfile(id, updatePatientDto, user);
  }

  @Patch('doctor/profile/:id')
  updateDoctorProfile(
    @Param('id') id: string,
    @UserDecorator() user: User,
    @Body() doctorDto: DoctorDto
  ): Promise<any> {
    return this.authService.updateDoctorProfile(id, doctorDto, user);
  }

  @Patch('pharmacist/profile/:id')
  updatePharmacistProfile(
    @Param('id') id: string,
    @UserDecorator() user: User,
    @Body() pharmacistDto: PharmacistDto
  ): Promise<any> {
    return this.authService.updatePharmacistProfile(id, pharmacistDto, user);
  }

  @Patch('admin/profile/:id')
  updateAdminProfile(
    @Param('id') id: string,
    @UserDecorator() user: User,
    @Body() adminDto: AdminDto
  ): Promise<any> {
    return this.authService.updateAdminProfile(id, adminDto, user);
  }
  @Roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACIST, UserRole.ADMIN)
  @Get('profile')
  getProfile(@UserDecorator() user: User) {
    return this.authService.getProfile(user);
  }

  @Get('me')
  getDetails(@UserDecorator() user: User){
    return this.authService.getDetails(user)
  }


}
