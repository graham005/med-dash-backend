import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Admin, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt'
import * as Bcrypt from 'bcrypt'
import { Auth } from './entities/auth.entity';
import { UserRole } from 'src/enums';
import { Patient } from 'src/users/entities/patient.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { AdminDto, DoctorDto, PatientDto, PharmacistDto } from './dto/profiles-dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Auth) private readonly authRepository: Repository<Auth>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Pharmacist) private readonly pharmacistRepository: Repository<Pharmacist>,
    //@InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) { }

  //Helper method to hash the password
  private async hashData(data: string): Promise<string> {
    const salt = await Bcrypt.genSalt(10)
    return await Bcrypt.hash(data, salt);
  }

  private async getTokens(userId: string, email: string, role: string) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
          expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
        }
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
          expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
        }
      )
    ])
    return {
      accessToken: at,
      refreshToken: rt
    }
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await this.hashData(refreshToken);

    // Find the user entity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Set expiry (e.g., 7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const foundUserId = await this.authRepository.findOne({ where: { user: { id: user.id } } })
    if (!foundUserId) {
      const auth = this.authRepository.create({
        token: hashedRefreshToken,
        user,
        expiresAt,
        isRevoked: false,
      });
      await this.authRepository.save(auth);
    } else {
      await this.authRepository.update(foundUserId.id, {
        token: hashedRefreshToken,
        expiresAt,
        isRevoked: false,
      });
    }
  }

  //Helper to exclude password
  private excludePassword(user: User): Partial<User> {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async signIn(signInDto: SignInDto) {
    const foundUser = await this.userRepository.findOne({
      where: { email: signInDto.email }

    });
    if (!foundUser) {
      throw new NotFoundException(`User with the email ${signInDto.email} not found`)
    }

    const foundPassword = await Bcrypt.compare(
      signInDto.password,
      foundUser.passwordHash,
    );
    if (!foundPassword) {
      throw new NotFoundException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.getTokens(
      foundUser.id,
      foundUser.email,
      foundUser.userRole
    )

    await this.saveRefreshToken(foundUser.id, refreshToken)

    return { accessToken, refreshToken }
  }

  async signUp(signUpDto: SignUpDto) {
    const existingUser = await this.userRepository.findOne({ where: { email: signUpDto.email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    const newUser = this.userRepository.create({
      firstName: signUpDto.firstName,
      lastName: signUpDto.lastName,
      email: signUpDto.email,
      passwordHash: await this.hashData(signUpDto.password),
      phoneNumber: signUpDto?.phoneNumber,
      userRole: UserRole.PATIENT
    })

    const savedUser = await this.userRepository
      .save(newUser)
      .then((user) => {
        return user
      })
      .catch((error) => {
        console.error('Error creating user =>', error)
        throw new Error('Failed to create user')
      });
    return this.excludePassword(savedUser)
  }

  async signOut(user: User) {
    await this.authRepository.update(user.id, {
      isRevoked: true
    })
  }

  async refreshToken(user: User, id: string, refreshToken: string) {
    const auth = await this.authRepository.findOne({
      where: { id }
    })
    if (!auth) {
      throw new NotFoundException('Not Found')
    }

    const foundUser = await this.userRepository.findOne({
      where: { id: user.id }

    });
    if (!foundUser) {
      throw new NotFoundException(`User not found`)
    }
    const refreshTokenMatches = await Bcrypt.compare(
      refreshToken,
      auth.token
    )

    if (!refreshTokenMatches) {
      throw new NotFoundException('Invalid token')
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.getTokens(
      foundUser.id,
      foundUser.email,
      foundUser.userRole
    )

    await this.saveRefreshToken(foundUser.id, refreshToken)

    return { accessToken, refreshToken: newRefreshToken }
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  async createPatientProfile(
    user: User,
    patientDto: PatientDto,
  ) {
    const foundUser = await this.userRepository.findOne({where: {id: user.id}})
    if(!foundUser){
      throw new NotFoundException('User not found')
    }
    if (!patientDto) throw new Error('PatientDto is required');
    const newProfile = this.patientRepository.create({
      user: foundUser,
      dateOfBirth: patientDto.dateOfBirth,
      bloodType: patientDto.bloodType,
    });
    const savedProfile = await this.patientRepository.save(newProfile);
    const { passwordHash, ...userWithoutPassword } = savedProfile.user;
    return { ...savedProfile, user: userWithoutPassword };
  }
  async createDoctorProfile(
    user: User,
    doctorDto?: DoctorDto,
  ) {
    const foundUser = await this.userRepository.findOne({where: {id: user.id}})
    if(!foundUser){
      throw new NotFoundException('User not found')
    }
    if (!doctorDto) throw new Error('DoctorDto is required');
    const newProfile = this.doctorRepository.create({
      user: foundUser,
      specialization: doctorDto.specialization,
      qualification: doctorDto.qualification,
      licenceNumber: doctorDto.licenseNumber,
    });
    const savedProfile = await this.doctorRepository.save(newProfile);
    const { passwordHash, ...userWithoutPassword } = savedProfile.user;
    return { ...savedProfile, user: userWithoutPassword };

  }
  async createPharmacistProfile(
    user: User,
    pharmacistDto?: PharmacistDto,
  ) {
    const foundUser = await this.userRepository.findOne({where: {id: user.id}})
    if(!foundUser){
      throw new NotFoundException('User not found')
    }
    if (!pharmacistDto) throw new Error('PharmacistDto is required');
    const newProfile = this.pharmacistRepository.create({
      user: foundUser,
      pharmacyName: pharmacistDto.pharmacyName,
      licenceNumber: pharmacistDto.licenceNumber,
    });
    const savedProfile = await this.pharmacistRepository.save(newProfile);
    const { passwordHash, ...userWithoutPassword } = savedProfile.user;
    return { ...savedProfile, user: userWithoutPassword };

  }
  // async createAdminProfile(
  //   //adminDto: AdminDto
  // ) {
  //       if (!pharmacistDto) throw new Error('PharmacistDto is required');
  //       const newProfile = this.pharmacistRepository.create({
  //         user,
  //         pharmacyName: pharmacistDto.pharmacyName,
  //         licenceNumber: pharmacistDto.licenceNumber,
  //       });
  //       const savedProfile = await this.pharmacistRepository.save(newProfile);
  //       const { passwordHash, ...userWithoutPassword } = savedProfile.user;
  //       return { ...savedProfile, user: userWithoutPassword };

  // }
  // async editProfile(
  //   user: User,
  //   patientDto: PatientDto,
  //   doctorDto: DoctorDto,
  //   pharmacistDto: PharmacistDto,
  //   adminDto: AdminDto
  // ) {
  //   if (user.userRole === UserRole.PATIENT) {
  //     const newProfile = this.patientRepository.update({
  //       user,
  //       dateOfBirth: patientDto.dateOfBirth,
  //       bloodType: patientDto.bloodType
  //     });
  //     const savedProfile = await this.patientRepository.save(newProfile);
  //     // Exclude password from user before returning
  //     const { passwordHash, ...userWithoutPassword } = savedProfile.user;
  //     return { ...savedProfile, user: userWithoutPassword };
  //   }

  //   if (user.userRole === UserRole.DOCTOR) {
  //     const newProfile = this.doctorRepository.update({
  //       user,
  //       specialization: doctorDto.specialization,
  //       qualification: doctorDto.qualification,
  //       licenceNumber: doctorDto.licenseNumber
  //     });
  //     const savedProfile = await this.doctorRepository.save(newProfile);
  //     // Exclude password from user before returning
  //     const { passwordHash, ...userWithoutPassword } = savedProfile.user;
  //     return { ...savedProfile, user: userWithoutPassword };
  //   }

  //   if (user.userRole === UserRole.PHARMACIST) {
  //     const newProfile = this.pharmacistRepository.update({
  //       user,
  //       pharmacyName: pharmacistDto.pharmacyName,
  //       licenceNumber: pharmacistDto.licenceNumber
  //     });
  //     const savedProfile = await this.pharmacistRepository.save(newProfile);
  //     // Exclude password from user before returning
  //     const { passwordHash, ...userWithoutPassword } = savedProfile.user;
  //     return { ...savedProfile, user: userWithoutPassword };
  //   }

  //   if (user.userRole === UserRole.ADMIN) {
  //     const newProfile = this.adminRepository.update({
  //       user,
  //       department: adminDto.department,
  //       isSuperAdmin: false
  //     });
  //     const savedProfile = await this.adminRepository.save(newProfile);
  //     // Exclude password from user before returning
  //     const { passwordHash, ...userWithoutPassword } = savedProfile.user;
  //     return { ...savedProfile, user: userWithoutPassword };
  //   }
  // }

  async getDetails(user: User){
    const foundUser = await this.userRepository.findOne({where: {id: user.id}})
    return foundUser
  }
}
