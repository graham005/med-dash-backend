import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAvailabilitySlotDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AvailabilitySlot } from './entities/availability.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Doctor } from 'src/users/entities/doctor.entity';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilitySlot) private readonly availabilityRepository: Repository<AvailabilitySlot>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>,
  ) {}


  async create(createAvailabilityDto: CreateAvailabilitySlotDto, user: User) {
    const doctor = await this.doctorRepository.findOne({
      where: {user: {id: user.id}},
      relations: ['user']
    })
    if(!doctor) {
      throw new NotFoundException('Doctor profile not found for the user')
    }
    const newAvailabilitySlot = await this.availabilityRepository.create({ ...createAvailabilityDto, doctor })
    await this.availabilityRepository.save(newAvailabilitySlot)

    return newAvailabilitySlot;
  }

  async findAll(user: User) {
    const availabilitySlot = await this.availabilityRepository.find({
      where: {
        doctor: {
          user: {
            id: user.id,
          }
        }
      },
      relations: ['doctor', 'doctor.user'],
    });
    if (availabilitySlot.length === 0) {
      throw new NotFoundException('No availability slots found');
    }
    return availabilitySlot;
  }

  async findOne(id: number) {
    const availabilitySlot = await this.availabilityRepository.findOne({ where: { id: id.toString() } });

    if (!availabilitySlot) {
      throw new NotFoundException('Availabilty slot not found')
    }

    return availabilitySlot;
  }

  async update(id: number, updateAvailabilityDto: UpdateAvailabilityDto) {
    return await this.availabilityRepository.update(id, updateAvailabilityDto)
      .then((result) => {
        if (result.affected === 0) {
          throw new NotFoundException('Availability Slot not found')
        }
      }).catch((error) => {
        console.error('Error updating availability slot:', error)
        throw new Error(`Error updating availability slot: ${error}`)
      })
      .finally(() => {
        return this.findOne(id)
      })
  }

  async remove(id: number, user: User) {
    return this.availabilityRepository.delete(id )
      .then((result) => {
        if (result.affected === 0) {
          throw new Error(`Availability Slot not found`)
        }
      }).catch((error) => {
        console.error('Error deleting Availability slot: ', error)
        throw new Error(`Error deleting Availability slot: ${error.message}`)
      })
  }
}
