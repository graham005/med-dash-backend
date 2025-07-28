import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as Bcrypt from 'bcrypt'
import { UserRole, UserStatus } from 'src/enums';
import { Public } from 'src/auth/decorators/public.decorator';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Pharmacist } from './entities/pharmacist.entity';
import { Admin } from './entities/admin.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Pharmacist) private readonly pharmacistRepository: Repository<Pharmacist>,
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
  ) { }

  // Hash password using bycrypt
  private async hashData(data: string): Promise<string> {
    const salt = await Bcrypt.genSalt(10)
    return await Bcrypt.hash(data, salt)
  }

  //Helper to exclude password
  private excludePassword(user: User): Partial<User> {
    const { passwordHash, ...rest} = user;
    return rest;
  }

  async create(createUserDto: CreateUserDto): Promise<Partial<User>> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    const newUser = this.userRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      passwordHash: await this.hashData(createUserDto.password),
      phoneNumber: createUserDto?.phoneNumber,
      userRole: createUserDto.userRole || UserRole.PATIENT
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

 
  async findAll(userRole?: UserRole): Promise<Partial<User>[]> {
    if(userRole) {
           const rolesArray =  await this.userRepository.find({ where: { userRole } });
           if(rolesArray.length === 0 || rolesArray === null) throw new NotFoundException ('User Role Not Found')
            return rolesArray
        }
    const users = await this.userRepository.find();

    if(users.length === 0){
      throw new NotFoundException('Users not Found')
    }

    return users.map(user => this.excludePassword(user))
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id} })
    if(!user) throw new NotFoundException('Users not found')
    
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<Partial<User> | string> {
    if (updateUserDto.password) {
      updateUserDto.password = await this.hashData(updateUserDto.password)
    }
    await this.userRepository.update(id, updateUserDto);

    const updatedUser = await this.userRepository.findOne({ where: { id } });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return this.excludePassword(updatedUser);
  }

  async remove(id: string) {
    try {
      // Check if user exists first
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const result = await this.userRepository.delete(id);
      
      if (result.affected === 0) {
        throw new NotFoundException('User not found');
      }
      
      return { message: 'User deleted successfully' };

    } catch (error) {
      console.error('Error removing user:', error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Handle foreign key constraint errors
      if (error.code === '23503') {
        throw new Error('Cannot delete user: User has associated records');
      }
      
      throw new Error(`Error removing user: ${error.message}`);
    }
  }

  async getAllProfiles() {
    const users = await this.userRepository.find();
    console.log(users)
    if (!users.length) {
     console.error('No users found');
    }

    // Fetch all profiles
    const [doctors, patients, pharmacists, admins] = await Promise.all([
      this.doctorRepository.find({ relations: ['user'] }),
      this.patientRepository.find({ relations: ['user'] }),
      this.pharmacistRepository.find({ relations: ['user'] }),
      this.adminRepository.find({ relations: ['user'] }),
    ]);

    // Helper to find profile by user id
    const findProfile = (userId: string) => {
      const doctor = doctors.find(d => d.user.id === userId);
      if (doctor) return { role: 'DOCTOR', profile: doctor };
      const patient = patients.find(p => p.user.id === userId);
      if (patient) return { role: 'PATIENT', profile: patient };
      const pharmacist = pharmacists.find(ph => ph.user.id === userId);
      if (pharmacist) return { role: 'PHARMACIST', profile: pharmacist };
      const admin = admins.find(a => a.user.id === userId);
      if (admin) return { role: 'ADMIN', profile: admin };
      return null;
    };

    // Map users to their profiles
    return users.map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      const profileInfo = findProfile(user.id);
      return {
        ...userWithoutPassword,
        profile: profileInfo ? profileInfo.profile : null,
        profileRole: profileInfo ? profileInfo.role : null,
      };
    });
  }
}
