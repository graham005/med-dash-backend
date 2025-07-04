import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Repository } from 'typeorm';
import { Doctor } from 'src/users/entities/doctor.entity';
import { AppointmentStatus } from 'src/enums';
import { User } from 'src/users/entities/user.entity';
import { AvailabilitySlot } from 'src/availability/entities/availability.entity';
import { LessThanOrEqual, MoreThanOrEqual, LessThan, MoreThan } from 'typeorm';
import { Patient } from 'src/users/entities/patient.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AvailabilitySlot) private readonly availabilityRepository: Repository<AvailabilitySlot>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
  ) {}
  async create(createAppointmentDto: CreateAppointmentDto, user: User) {
    const patient = await this.patientRepository.findOne({
      where: { user: {id: user.id}}
    })
    console.log(patient?.id)
    if(!patient) {
      throw new NotFoundException('Patient not found')
    }
    const doctor = await this.doctorRepository.findOne({ where: { id: createAppointmentDto.doctorId } })
    if(!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const startTime = new Date(createAppointmentDto.startTime);
    const endTime = new Date(createAppointmentDto.endTime);
    

    // 1. Check doctor's availability
    const slot = await this.availabilityRepository.findOne({
      where: {
        id: createAppointmentDto.availabilitySlotId,
        doctor: { id: createAppointmentDto.doctorId },
        startTime: startTime,
        endTime: endTime,
      },
    });
    if (!slot) {
      throw new NotFoundException('Availability slot not found for this doctor and time');
    }

    // Check if slot is already booked
    const alreadyBooked = await this.appointmentRepository.findOne({
      where: { availabilitySlot: { id: slot.id } }
    });
    if (alreadyBooked) {
      throw new ConflictException('This slot is already booked');
    }

    const newAppointment = this.appointmentRepository.create({
      startTime,
      endTime,
      doctor,
      patient,
      status: createAppointmentDto.status,
      availabilitySlot: slot,
    });
    return this.appointmentRepository.save(newAppointment);
  }

  async findAll(user: User) {
    const loggedInUser = await this.userRepository.findOne({ where: { id: user.id}});
    if(!loggedInUser) {
      throw new NotFoundException('Not Found')
    }
    const appointments = await this.appointmentRepository.find({
       where: { patient: { user: {id: user.id}} },
       relations: ['patient', 'patient.user']
    })
    if(appointments.length === 0) {
      throw new NotFoundException('No Appointments Found')
    }
    return appointments;
  }

  async findOne(id: number, user: User) {
    
    const appointment = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.user', 'user')
      .where('appointment.id = :id', { id: id.toString() })
      .andWhere('user.id = :userId', { userId: user.id })
      .getOne();
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async update(id: number, updateAppointmentDto: UpdateAppointmentDto, user: User) {
    return await this.appointmentRepository.update(id, updateAppointmentDto)
      .then((result) => {
        if (result.affected === 0) {
          throw new NotFoundException('Appointment not found.')
        }
      }).catch((error) => {
        console.error('Error updating appointment:', error)
        throw new Error(`Error uodating appointment: ${error.message}` )
      }).finally(() => {
        return this.findOne(id, user)
      })
  }

  async remove(id: number, user: User) {
    const appointment = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.user', 'user')
      .where('appointment.id = :id', { id: id.toString() })
      .andWhere('user.id = :userId', { userId: user.id })
      .getOne();
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepository.save(appointment);
    return appointment;
  }

  async findAllforDoctor(user: User) {
    const doctor = await this.doctorRepository.findOne({
      where: {user: {id: user.id}},
      relations: ['user']
    })
    if(!doctor) {
      throw new NotFoundException('Doctor profile not found')
    }

    const appointment = await this.appointmentRepository.find({
      where: {doctor: {id: doctor.user.id}},
      relations: ['doctor', 'doctor.user', 'patient', 'availabilitySlot'],
    })

    if(appointment.length === 0) {
      throw new NotFoundException('No appointments found for Doctor')
    }
  }

  async findOneforDoctor(id: string, user: User ) {
    // Find the doctor profile for the logged-in user
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Find the appointment by id and ensure it belongs to this doctor
    const appointment = await this.appointmentRepository.findOne({
      where: {
        id: id,
        doctor: { id: doctor.user.id },
      },
      relations: ['doctor', 'doctor.user', 'patient', 'availabilitySlot'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found for this doctor');
    }

    return appointment;
  }
}

