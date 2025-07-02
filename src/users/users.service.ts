import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as Bcrypt from 'bcrypt'
import { UserRole } from 'src/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>
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
    const newUser = await this.userRepository.create({
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
    let users: User[];
    if(userRole) {
           const rolesArray =  await this.userRepository.find({ where: { userRole } });
           if(rolesArray.length === 0 || rolesArray === null) throw new NotFoundException ('User Role Not Found')
            return rolesArray
        }
    users = await this.userRepository.find();

    return users.map(user => this.excludePassword(user))
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: id.toString() } })
    if(!user) throw new NotFoundException('Users not found')
    
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<Partial<User> | string> {
    if (updateUserDto.password) {
      updateUserDto.password = await this.hashData(updateUserDto.password)
    }
    await this.userRepository.update(id, updateUserDto);

    return await this.findOne(id)
  }

  remove(id: number) {
    return this.userRepository.delete(id)
      .then((result) => {
        if (result.affected === 0){
          throw new NotFoundException('User not found')
        }
        return { message: 'User deleted successfully'}
      })
      .catch((error) => {
        console.error('Error deleting user:', error);
        throw new Error(`Error deleting user: ${error.message}`)
      })
  }
}
