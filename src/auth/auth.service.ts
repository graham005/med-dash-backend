import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt'
import * as Bcrypt from 'bcrypt'
import { Auth } from './entities/auth.entity';
import { UserRole } from 'src/enums';
import { Patient } from 'src/users/entities/patient.entity';
import { Doctor } from 'src/users/entities/doctor.entity';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { AdminDto, DoctorDto, PatientDto, PharmacistDto, UpdateAdminDto, UpdateDoctorDto, UpdatePatientDto, UpdatePharmacistDto } from './dto/profiles-dto';
import { Admin } from 'src/users/entities/admin.entity';
import { ParamedicDto, UpdateParamedicDto } from './dto/profiles-dto';
import { Paramedic } from 'src/users/entities/paramedic.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Auth) private readonly authRepository: Repository<Auth>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Pharmacist) private readonly pharmacistRepository: Repository<Pharmacist>,
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Paramedic) private readonly paramedicRepository: Repository<Paramedic>,
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
    // Find the Auth entity by user relation, not by id
    const auth = await this.authRepository.findOne({
      where: { user: { id: user.id } }
    });
    if (!auth) {
      throw new NotFoundException('Not Found');
    }

    const foundUser = await this.userRepository.findOne({
      where: { id: user.id }
    });
    if (!foundUser) {
      throw new NotFoundException(`User not found`);
    }
    const refreshTokenMatches = await Bcrypt.compare(
      refreshToken,
      auth.token
    );

    if (!refreshTokenMatches) {
      throw new NotFoundException('Invalid token');
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.getTokens(
      foundUser.id,
      foundUser.email,
      foundUser.userRole
    );

    await this.saveRefreshToken(foundUser.id, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  changePassword(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  async createPatientProfile(
    user: User,
    patientDto: PatientDto,
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } })
    if (!foundUser) {
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

  async updatePatientProfile(
    id: string,
    updatePatientDto: UpdatePatientDto,
    user: User
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      console.error('User not found');
      throw new NotFoundException('User not found');
    }

    const patient = await this.patientRepository.findOne({ where: { id, user: { id: user.id } }, relations: ['user'] });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    await this.patientRepository.update(id, updatePatientDto);

    const updatedPatient = await this.patientRepository.findOne({ where: { id }, relations: ['user'] });
    if (!updatedPatient) {
      throw new NotFoundException('Updated patient profile not found');
    }

    const { passwordHash, ...userWithoutPassword } = updatedPatient.user;
    return { ...updatedPatient, user: userWithoutPassword };
  }

  async createDoctorProfile(
    user: User,
    doctorDto?: DoctorDto,
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } })
    if (!foundUser) {
      throw new NotFoundException('User not found')
    }
    if (!doctorDto) throw new Error('DoctorDto is required');
    const newProfile = this.doctorRepository.create({
      user: foundUser,
      specialization: doctorDto.specialization,
      qualification: doctorDto.qualification,
      licenseNumber: doctorDto.licenseNumber,
      yearsOfExperience: doctorDto.yearsOfExperience, // <-- ensure this is present
      hospitalAffiliation: doctorDto.hospitalAffiliation,
    });
    const savedProfile = await this.doctorRepository.save(newProfile);
    const { passwordHash, ...userWithoutPassword } = savedProfile.user;
    return { ...savedProfile, user: userWithoutPassword };
  }

  async updateDoctorProfile(
    id: string,
    updateDoctorDto: UpdateDoctorDto,
    user: User
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      console.error('User not found');
      throw new NotFoundException('User not found');
    }

    const doctor = await this.doctorRepository.findOne({ where: { id, user: { id: user.id } }, relations: ['user'] });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    await this.doctorRepository.update(id, updateDoctorDto);

    const updatedDoctor = await this.doctorRepository.findOne({ where: { id }, relations: ['user'] });
    if (!updatedDoctor) {
      throw new NotFoundException('Updated doctor profile not found');
    }

    const { passwordHash, ...userWithoutPassword } = updatedDoctor.user;
    return { ...updatedDoctor, user: userWithoutPassword };
  }

  async createPharmacistProfile(
    user: User,
    pharmacistDto?: PharmacistDto,
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } })
    if (!foundUser) {
      throw new NotFoundException('User not found')
    }
    if (!pharmacistDto) throw new Error('PharmacistDto is required');
    const newProfile = this.pharmacistRepository.create({
      user: foundUser,
      pharmacyName: pharmacistDto.pharmacyName,
      licenseNumber: pharmacistDto.licenseNumber,
    });
    const savedProfile = await this.pharmacistRepository.save(newProfile);
    const { passwordHash, ...userWithoutPassword } = savedProfile.user;
    return { ...savedProfile, user: userWithoutPassword };

  }

  async updatePharmacistProfile(
    id: string,
    updatePharmacistDto: UpdatePharmacistDto,
    user: User
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      console.error('User not found');
      throw new NotFoundException('User not found');
    }

    const pharmacist = await this.pharmacistRepository.findOne({ where: { id, user: { id: user.id } }, relations: ['user'] });
    if (!pharmacist) {
      throw new NotFoundException('Pharmacist profile not found');
    }

    await this.pharmacistRepository.update(id, updatePharmacistDto);

    const updatedPharmacist = await this.pharmacistRepository.findOne({ where: { id }, relations: ['user'] });
    if (!updatedPharmacist) {
      throw new NotFoundException('Updated pharmacist profile not found');
    }

    const { passwordHash, ...userWithoutPassword } = updatedPharmacist.user;
    return { ...updatedPharmacist, user: userWithoutPassword };
  }

  async createAdminProfile(
    user: User,
    adminDto: AdminDto,
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } })
    if (!foundUser) {
      console.error('User not found')
      throw new NotFoundException('User not found')
    }
    const newProfile = this.adminRepository.create({
      user: foundUser,
      department: adminDto.department,
    })
    const savedProfile = await this.adminRepository.save(newProfile);
    const { passwordHash, ...userWithoutPassword } = savedProfile.user;
    return { ...savedProfile, user: userWithoutPassword };
  }

  async updateAdminProfile(
    id: string,
    updateAdminDto: UpdateAdminDto,
    user: User
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    const admin = await this.adminRepository.findOne({ where: { id, user: { id: user.id } }, relations: ['user'] });
    if (!admin) {
      throw new NotFoundException('Admin profile not found');
    }

    // Separate user fields from admin fields
    const { firstName, lastName, email, ...adminFields } = updateAdminDto;

    // Update user fields if present
    if (firstName || lastName || email) {
      await this.userRepository.update(foundUser.id, {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
      });
    }

    // Update admin fields
    await this.adminRepository.update(id, adminFields);

    const updatedAdmin = await this.adminRepository.findOne({ where: { id }, relations: ['user'] });
    if (!updatedAdmin) {
      throw new NotFoundException('Updated admin profile not found');
    }

    const { passwordHash, ...userWithoutPassword } = updatedAdmin.user;
    return { ...updatedAdmin, user: userWithoutPassword };
  }

  async createParamedicProfile(
    user: User,
    paramedicDto?: ParamedicDto,
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }
    if (!paramedicDto) throw new Error('ParamedicDto is required');
    const newProfile = this.paramedicRepository.create({
      user: foundUser,
      ambulanceId: paramedicDto.ambulanceId,
      licenseNumber: paramedicDto.licenseNumber,
      station: paramedicDto.station,
    });
    const savedProfile = await this.paramedicRepository.save(newProfile);
    const { passwordHash, ...userWithoutPassword } = savedProfile.user;
    return { ...savedProfile, user: userWithoutPassword };
  }

  async updateParamedicProfile(
    id: string,
    updateParamedicDto: UpdateParamedicDto,
    user: User
  ) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    const paramedic = await this.paramedicRepository.findOne({ where: { id, user: { id: user.id } }, relations: ['user'] });
    if (!paramedic) {
      throw new NotFoundException('Paramedic profile not found');
    }

    await this.paramedicRepository.update(id, updateParamedicDto);

    const updatedParamedic = await this.paramedicRepository.findOne({ where: { id }, relations: ['user'] });
    if (!updatedParamedic) {
      throw new NotFoundException('Updated paramedic profile not found');
    }

    const { passwordHash, ...userWithoutPassword } = updatedParamedic.user;
    return { ...updatedParamedic, user: userWithoutPassword };
  }

  async getProfile(user: User) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    switch (foundUser.userRole) {
      case UserRole.PATIENT: {
        const patient = await this.patientRepository.findOne({ where: { user: { id: foundUser.id } }, relations: ['user'] });
        if (!patient) throw new NotFoundException('Patient profile not found');
        const { passwordHash, ...userWithoutPassword } = patient.user;
        return { ...patient, user: userWithoutPassword };
      }
      case UserRole.DOCTOR: {
        const doctor = await this.doctorRepository.findOne({ where: { user: { id: foundUser.id } }, relations: ['user'] });
        if (!doctor) throw new NotFoundException('Doctor profile not found');
        const { passwordHash, ...userWithoutPassword } = doctor.user;
        return { ...doctor, user: userWithoutPassword };
      }
      case UserRole.PHARMACIST: {
        const pharmacist = await this.pharmacistRepository.findOne({ where: { user: { id: foundUser.id } }, relations: ['user'] });
        if (!pharmacist) throw new NotFoundException('Pharmacist profile not found');
        const { passwordHash, ...userWithoutPassword } = pharmacist.user;
        return { ...pharmacist, user: userWithoutPassword };
      }
      case UserRole.ADMIN: {
        const admin = await this.adminRepository.findOne({ where: { user: { id: foundUser.id } }, relations: ['user'] });
        if (!admin) throw new NotFoundException('Admin profile not found');
        const { passwordHash, ...userWithoutPassword } = admin.user;
        return { ...admin, user: userWithoutPassword };
      }
      default:
        throw new NotFoundException('Profile not found for this role');
    }
  }

  async getDetails(user: User) {
    const foundUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    let profile: Patient | Doctor | Pharmacist | Admin | null = null;

    switch (foundUser.userRole) {
      case UserRole.PATIENT: {
        profile = await this.patientRepository.findOne({ where: { user: { id: foundUser.id } }, relations: ['user'] });
        break;
      }
      case UserRole.DOCTOR: {
        profile = await this.doctorRepository.findOne({ where: { user: { id: foundUser.id } }, relations: ['user'] });
        break;
      }
      case UserRole.PHARMACIST: {
        profile = await this.pharmacistRepository.findOne({ where: { user: { id: foundUser.id } }, relations: ['user'] });
        break;
      }
      case UserRole.ADMIN: {
        profile = await this.adminRepository.findOne({ where: { user: { id: foundUser.id } }, relations: ['user'] });
        break;
      }
      default:
        profile = null;
    }

    return {
      user: this.excludePassword(foundUser),
      profile,
    };
  }
}
