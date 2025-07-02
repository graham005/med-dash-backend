import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Repository } from 'typeorm';
import { Doctor } from 'src/users/entities/doctor.entity';
import { AppointmentStatus } from 'src/enums';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>
  ) {}
  async create(createAppointmentDto: CreateAppointmentDto) {
    const doctor = await this.doctorRepository.findOne({ where: { id: createAppointmentDto.doctorId } })
    if(!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    const newAppointment = this.appointmentRepository.create({
      startTime: createAppointmentDto.startTime,
      endTime: createAppointmentDto.endTime,
      doctor: doctor,
      status: createAppointmentDto.status
    });
    return this.appointmentRepository.save(newAppointment)
  }

  async findAll() {
    const appointments = await this.appointmentRepository.find()
    if(appointments.length === 0) {
      throw new NotFoundException('No Appointments Found')
    }
    return appointments;
  }

  async findOne(id: number) {
    const appointment = await this.appointmentRepository.findOne({ where: { id: id.toString() } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    return await this.appointmentRepository.update(id, updateAppointmentDto)
      .then((result) => {
        if (result.affected === 0) {
          throw new NotFoundException('Appointment not found.')
        }
      }).catch((error) => {
        console.error('Error updating appointment:', error)
        throw new Error(`Error uodating appointment: ${error.message}` )
      }).finally(() => {
        return this.findOne(id)
      })
  }

  async remove(id: number) {
    const appointment = await this.appointmentRepository.findOne({ where: { id: id.toString() } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepository.save(appointment);
    return appointment;
  }
}
