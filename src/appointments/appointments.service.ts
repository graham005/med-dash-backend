import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Not, Repository } from 'typeorm';
import { Doctor } from 'src/users/entities/doctor.entity';
import { AppointmentStatus } from 'src/enums';
import { User } from 'src/users/entities/user.entity';
import { AvailabilitySlot } from 'src/availability/entities/availability.entity';
import { LessThanOrEqual, MoreThanOrEqual, LessThan, MoreThan } from 'typeorm';
import { Patient } from 'src/users/entities/patient.entity';
import { ZoomService } from 'src/zoom/zoom.service'; 

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AvailabilitySlot) private readonly availabilityRepository: Repository<AvailabilitySlot>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    private readonly zoomService: ZoomService 
  ) { }

  async create(createAppointmentDto: CreateAppointmentDto, user: User) {
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } }
    })
    console.log(patient?.id)
    if (!patient) {
      throw new NotFoundException('Patient not found')
    }
    const doctor = await this.doctorRepository.findOne({
      where: { id: createAppointmentDto.doctorId },
      relations: ['user'], // <-- Add this line
    });
    if (!doctor) {
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
      where: { availabilitySlot: { id: slot.id }, status: Not(AppointmentStatus.CANCELLED) }
    });
    if (alreadyBooked) {
      throw new ConflictException('This slot is already booked');
    }

    // Prepare appointment entity
    const newAppointment = this.appointmentRepository.create({
      availabilitySlot: slot,
      doctor: doctor,
      endTime,
      patient: patient,
      reasonForVisit: createAppointmentDto.reasonForVisit,
      startTime,
      status: createAppointmentDto.status,
    });

    // If the slot type is 'consultation', create a Zoom meeting and save the URL
    if (slot.type && slot.type.toLowerCase() === 'consultation') {
      try {
        const zoomMeeting = await this.zoomService.createMeeting(
          `Consultation with Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
          startTime.toISOString(),
          Math.ceil((endTime.getTime() - startTime.getTime()) / 60000) // duration in minutes
        );
        newAppointment.meetingUrl = zoomMeeting.join_url;
      } catch (error) {
        // Optionally, you can throw or log but still allow appointment creation
        console.error('Failed to create Zoom meeting:', error);
        throw new ConflictException('Failed to create Zoom meeting for consultation slot');
      }
    }

    await this.availabilityRepository.update(slot.id, { isBooked: true })
    return this.appointmentRepository.save(newAppointment);
  }

  async findAll(user: User) {
    const loggedInUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!loggedInUser) {
      throw new NotFoundException('Not Found')
    }
    const appointments = await this.appointmentRepository.find({
      where: { patient: { user: { id: user.id } } },
      relations: ['patient', 'patient.user', 'doctor', 'doctor.user', 'doctor.availability', 'availabilitySlot']
    })
    if (appointments.length === 0) {
      throw new NotFoundException('No Appointments Found')
    }
    return appointments;
  }

  async findOne(id: string, user: User) {
  const appointment = await this.appointmentRepository
    .createQueryBuilder('appointment')
    .leftJoinAndSelect('appointment.patient', 'patient')
    .leftJoinAndSelect('patient.user', 'patientUser')
    .leftJoinAndSelect('appointment.doctor', 'doctor')
    .leftJoinAndSelect('doctor.user', 'doctorUser')
    .leftJoinAndSelect('appointment.availabilitySlot', 'availabilitySlot')
    .where('appointment.id = :id', { id })
    .andWhere('patientUser.id = :userId', { userId: user.id })
    .getOne();

  if (!appointment) {
    throw new NotFoundException('Appointment not found');
  }
  return appointment;
}

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto, user: User) {
  try {
    const result = await this.appointmentRepository.update(id, updateAppointmentDto);
    if (result.affected === 0) {
      throw new NotFoundException('Appointment not found.');
    }
    // Return the updated appointment
    return await this.findOne(id, user);
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw new ConflictException(`Error updating appointment: ${error.message}`);
  }
}

  async updateStatusForDoctor(id: string, status: AppointmentStatus, user: User) {
    // Find the doctor profile for the logged-in user
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }
    console.log('Doctor entity:', doctor);

    // Find the appointment by id and ensure it belongs to this doctor
    const appointment = await this.appointmentRepository.findOne({
      where: {
        id: id,
        doctor: { id: doctor.id },
      },
      relations: ['doctor', 'doctor.user', 'patient', 'patient.user', 'availabilitySlot'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found for this doctor');
    }

    appointment.status = status;

    // If status is changed to CANCELLED, set isBooked to false for the slot
    if (
      status === AppointmentStatus.CANCELLED &&
      appointment.availabilitySlot
    ) {
      await this.availabilityRepository.update(
        appointment.availabilitySlot.id,
        { isBooked: false }
      );
    }

    await this.appointmentRepository.save(appointment);
    return appointment;
  }

  async remove(id: string, user: User) {
    const appointment = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.user', 'user')
      .leftJoinAndSelect('appointment.availabilitySlot', 'availabilitySlot') // Ensure slot is loaded
      .where('appointment.id = :id', { id: id.toString() })
      .andWhere('user.id = :userId', { userId: user.id })
      .getOne();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    appointment.status = AppointmentStatus.CANCELLED;

    // Set slot as available again if its end time has not passed
    if (appointment.availabilitySlot && appointment.availabilitySlot.endTime > new Date()) {
      await this.availabilityRepository.update(
        appointment.availabilitySlot.id,
        { isBooked: false }
      );
    }

    await this.appointmentRepository.save(appointment);
    return appointment;
  }

  async findAllforDoctor(user: User) {
    try {
      const doctor = await this.doctorRepository.findOne({
        where: { user: { id: user.id } },
        relations: ['user']
      })
      if (!doctor) {
        throw new NotFoundException('Doctor profile not found')
      }

      const appointment = await this.appointmentRepository.find({
        where: { doctor: { id: doctor.id } },
        relations: ['doctor', 'doctor.user', 'patient', 'patient.user', 'availabilitySlot'],
      })
      if (appointment.length === 0) {
        throw new NotFoundException('No appointments found for')
      }
      return appointment
    } catch (error) {
      throw new NotFoundException(error)
    }

  }

  async findOneforDoctor(id: string, user: User) {
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
        doctor: { id: doctor.id },
      },
      relations: ['doctor', 'doctor.user', 'patient', 'patient.user', 'availabilitySlot'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found for this doctor');
    }

    return appointment;
  }
}

