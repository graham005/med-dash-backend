import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { User as UserDecorator } from '../auth/decorators/user.decorator'
import { PatientDto, DoctorDto, PharmacistDto, AdminDto } from './dto/profiles-dto';
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
    @UserDecorator() user: any
  ) {
    return this.authService.signOut(user);
  }

  @Roles(UserRole.PHARMACIST, UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
  @Get('refresh')
  refreshToken(
    @UserDecorator() user: any,
    @Query('id') id: string,
    @Query('refreshToken') refreshToken: string
  ) {
    return this.authService.refreshToken(user, id, refreshToken);
  }

  @Roles(UserRole.PHARMACIST, UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
  @Patch('change-password')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Roles(UserRole.PATIENT)
  @Post('patient/profile')
  createPatientProfile(
    @UserDecorator() user: any,
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
    @UserDecorator() user: any,
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
    @UserDecorator() user: any,
    @Body()
    pharmacistDto: PharmacistDto,
  ) {
    return this.authService.createPharmacistProfile(
      user,
      pharmacistDto,
    )
  }

  @Get('me')
  getDetails(@UserDecorator() user: User){
    return this.authService.getDetails(user)
  }
  // @Post('create-adminprofile')
  // createAdminProfile(
  //   @UserDecorator() user: any,
  //   @Body()
  //   adminDto: AdminDto
  // ) {
  //   return this.authService.createAdminProfile(
  //     user,
  //     //adminDto
  //   )
  // }

  // @Patch()
  // editProfile(
  //   @UserDecorator() user: any,
  //   @Body()
  //   patientDto: PatientDto,
  //   doctorDto: DoctorDto,
  //   pharmacistDto: PharmacistDto,
  //   adminDto: AdminDto
  // ) {
  //   return this.authService.editProfile(
  //     user,
  //     patientDto,
  //     doctorDto,
  //     pharmacistDto,
  //     adminDto
  //   )
  // }

}
