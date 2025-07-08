import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    console.log('Creating availability slot:', createAvailabilityDto); // Debug log
    
    try {
      const doctor = await this.doctorRepository.findOne({
        where: {user: {id: user.id}},
        relations: ['user']
      });
      
      if (!doctor) {
        throw new NotFoundException('Doctor profile not found for the user');
      }

      // Validate time slots
      const startTime = new Date(createAvailabilityDto.startTime);
      const endTime = new Date(createAvailabilityDto.endTime);
      
      console.log('Parsed dates:', { startTime, endTime }); // Debug log
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new BadRequestException('Invalid date format provided');
      }
      
      if (startTime >= endTime) {
        throw new BadRequestException('Start time must be before end time');
      }

      // Check if the slot is in the past
      const now = new Date();
      if (startTime < now) {
        throw new BadRequestException('Cannot create availability slot in the past');
      }

      // Check for overlapping slots
      const existingSlots = await this.availabilityRepository.find({
        where: {
          doctor: { id: doctor.id },
        },
      });

      const hasOverlap = existingSlots.some(slot => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        return (startTime < slotEnd && endTime > slotStart);
      });

      if (hasOverlap) {
        throw new BadRequestException('Time slot overlaps with existing availability');
      }

      const newAvailabilitySlot = this.availabilityRepository.create({
        startTime: startTime,
        endTime: endTime,
        type: createAvailabilityDto.type || 'STANDARD',
        doctor
      });

      const savedSlot = await this.availabilityRepository.save(newAvailabilitySlot);
      
      // Return with relations
      return await this.availabilityRepository.findOne({
        where: { id: savedSlot.id },
        relations: ['doctor', 'doctor.user']
      });
    } catch (error) {
      console.error('Error creating availability slot:', error);
      throw error;
    }
  }

  async findAll(user: User) {
    try {
      const doctor = await this.doctorRepository.findOne({
        where: {user: {id: user.id}},
        relations: ['user']
      });
      
      if (!doctor) {
        throw new NotFoundException('Doctor profile not found for the user');
      }

      const availabilitySlots = await this.availabilityRepository.find({
        where: {
          doctor: { id: doctor.id }
        },
        relations: ['doctor', 'doctor.user'],
        order: { startTime: 'ASC' }
      });

      return availabilitySlots;
    } catch (error) {
      console.error('Error fetching availability slots:', error);
      throw error;
    }
  }

  async findAllDoctors() {
    const availabilitySlots = await this.availabilityRepository.find({
      relations: ['doctor', 'doctor.user'],
    });
    return availabilitySlots;
  }

  async findOne(id: string) {
    try {
      const availabilitySlot = await this.availabilityRepository.findOne({ 
        where: { id: id.toString() },
        relations: ['doctor', 'doctor.user']
      });

      if (!availabilitySlot) {
        throw new NotFoundException('Availability slot not found');
      }

      return availabilitySlot;
    } catch (error) {
      console.error('Error fetching availability slot:', error);
      throw error;
    }
  }

  async update(id: string, updateAvailabilityDto: UpdateAvailabilityDto) {
    try {
      const existingSlot = await this.findOne(id);
      
      if (!existingSlot) {
        throw new NotFoundException('Availability slot not found');
      }

      // Validate time slots if provided
      if (updateAvailabilityDto.startTime || updateAvailabilityDto.endTime) {
        const startTime = updateAvailabilityDto.startTime 
          ? new Date(updateAvailabilityDto.startTime)
          : existingSlot.startTime;
        const endTime = updateAvailabilityDto.endTime 
          ? new Date(updateAvailabilityDto.endTime)
          : existingSlot.endTime;

        if (startTime >= endTime) {
          throw new BadRequestException('Start time must be before end time');
        }
      }

      await this.availabilityRepository.update(id, updateAvailabilityDto);
      
      return await this.findOne(id);
    } catch (error) {
      console.error('Error updating availability slot:', error);
      throw error;
    }
  }

  async remove(id: string, user: User) {
    try {
      const availabilitySlot = await this.findOne(id);
      
      if (!availabilitySlot) {
        throw new NotFoundException('Availability slot not found');
      }

      // Verify the slot belongs to the user
      if (availabilitySlot.doctor.user.id !== user.id) {
        throw new BadRequestException('You can only delete your own availability slots');
      }

      await this.availabilityRepository.delete(id.toString());
      
      return { message: 'Availability slot deleted successfully' };
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      throw error;
    }
  }
}
