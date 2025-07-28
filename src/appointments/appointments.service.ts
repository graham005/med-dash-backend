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
import { EmailService } from 'src/mail/mail.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor) private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AvailabilitySlot) private readonly availabilityRepository: Repository<AvailabilitySlot>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    private readonly zoomService: ZoomService,
    private readonly emailService: EmailService
  ) { }

  async create(createAppointmentDto: CreateAppointmentDto, user: User) {
    const patient = await this.patientRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user']
    })
    console.log(patient?.id)
    if (!patient) {
      throw new NotFoundException('Patient not found')
    }
    const doctor = await this.doctorRepository.findOne({
      where: { id: createAppointmentDto.doctorId },
      relations: ['user'],
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
    const savedAppointment = await this.appointmentRepository.save(newAppointment);

    // Send email notifications after successful appointment creation
    try {
      // Send confirmation email to patient
      await this.emailService.sendAppointmentConfirmation(
        patient.user.email,
        patient.user.firstName,
        {
          id: savedAppointment.id,
          date: startTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: `${startTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} - ${endTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
          doctor: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
          specialization: doctor.specialization,
          type: slot.type,
          reasonForVisit: createAppointmentDto.reasonForVisit,
          status: createAppointmentDto.status,
          meetingUrl: newAppointment.meetingUrl || null,
          appointmentUrl: `${process.env.FRONTEND_URL}/dashboard/patient/appointments`
        }
      );

      // Send new appointment notification to doctor
      await this.emailService.sendNewAppointmentNotification(
        doctor.user.email,
        doctor.user.firstName,
        {
          id: savedAppointment.id,
          patientName: `${patient.user.firstName} ${patient.user.lastName}`,
          date: startTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: `${startTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} - ${endTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
          type: slot.type,
          reasonForVisit: createAppointmentDto.reasonForVisit,
          status: createAppointmentDto.status,
          appointmentUrl: `${process.env.FRONTEND_URL}/dashboard/doctor/appointments/${savedAppointment.id}`
        }
      );

      // If it's a consultation with meeting URL, send meeting details
      if (newAppointment.meetingUrl) {
        await this.emailService.sendMeetingUrl(
          patient.user.email,
          patient.user.firstName,
          newAppointment.meetingUrl,
          {
            date: startTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            time: `${startTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })} - ${endTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}`,
            doctor: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`
          }
        );
      }
    } catch (error) {
      console.error('Failed to send appointment emails:', error);
      // Don't throw error as appointment creation was successful
    }

    return savedAppointment;
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
      console.error('No Appointments Found')
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
      // Get the appointment before update for email notifications
      const existingAppointment = await this.appointmentRepository.findOne({
        where: { id },
        relations: ['patient', 'patient.user', 'doctor', 'doctor.user', 'availabilitySlot']
      });

      const result = await this.appointmentRepository.update(id, updateAppointmentDto);
      if (result.affected === 0) {
        throw new NotFoundException('Appointment not found.');
      }

      // Get the updated appointment
      const updatedAppointment = await this.findOne(id, user);

      // Send email notifications for status changes
      if (existingAppointment && updateAppointmentDto.status && 
          existingAppointment.status !== updateAppointmentDto.status) {
        try {
          await this.emailService.sendAppointmentStatusUpdate(
            existingAppointment.patient.user.email,
            existingAppointment.patient.user.firstName,
            {
              id: existingAppointment.id,
              oldStatus: existingAppointment.status,
              newStatus: updateAppointmentDto.status,
              date: existingAppointment.startTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              time: `${existingAppointment.startTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })} - ${existingAppointment.endTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}`,
              doctor: `Dr. ${existingAppointment.doctor.user.firstName} ${existingAppointment.doctor.user.lastName}`,
              appointmentUrl: `${process.env.FRONTEND_URL}/dashboard/patient/appointments`
            }
          );
        } catch (error) {
          console.error('Failed to send status update email:', error);
        }
      }

      return updatedAppointment;
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

    const oldStatus = appointment.status;
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

    const updatedAppointment = await this.appointmentRepository.save(appointment);

    // Send email notification to patient about status change
    try {
      await this.emailService.sendAppointmentStatusUpdate(
        appointment.patient.user.email,
        appointment.patient.user.firstName,
        {
          id: appointment.id,
          oldStatus: oldStatus,
          newStatus: status,
          date: appointment.startTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: `${appointment.startTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} - ${appointment.endTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
          doctor: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
          appointmentUrl: `${process.env.FRONTEND_URL}/dashboard/patient/appointments`
        }
      );
    } catch (error) {
      console.error('Failed to send status update email:', error);
    }

    return updatedAppointment;
  }

  async remove(id: string, user: User) {
    const appointment = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('appointment.availabilitySlot', 'availabilitySlot')
      .where('appointment.id = :id', { id: id.toString() })
      .andWhere('patientUser.id = :userId', { userId: user.id })
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

    const cancelledAppointment = await this.appointmentRepository.save(appointment);

    // Send cancellation emails
    try {
      // Email to patient
      await this.emailService.sendAppointmentCancellation(
        appointment.patient.user.email,
        appointment.patient.user.firstName,
        {
          id: appointment.id,
          date: appointment.startTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: `${appointment.startTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} - ${appointment.endTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
          doctor: `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
          cancelledBy: 'patient',
          appointmentUrl: `${process.env.FRONTEND_URL}/dashboard/patient/book-appointment`
        }
      );

      // Email to doctor
      await this.emailService.sendAppointmentCancellationNotification(
        appointment.doctor.user.email,
        appointment.doctor.user.firstName,
        {
          id: appointment.id,
          patientName: `${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`,
          date: appointment.startTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: `${appointment.startTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} - ${appointment.endTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
          cancelledBy: 'patient',
          appointmentUrl: `${process.env.FRONTEND_URL}/dashboard/doctor/appointments`
        }
      );
    } catch (error) {
      console.error('Failed to send cancellation emails:', error);
    }

    return cancelledAppointment;
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

