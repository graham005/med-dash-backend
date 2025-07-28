import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EMSRequest } from './entities/ems.entity';
import { User } from 'src/users/entities/user.entity';
import { Paramedic } from 'src/users/entities/paramedic.entity';
import { EMSStatus, UserRole } from 'src/enums';
import { CreateEmsRequestDto } from './dto/create-ems-request.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Patient } from 'src/users/entities/patient.entity';

@Injectable()
export class EMSService {
  private readonly logger = new Logger(EMSService.name);

  constructor(
    @InjectRepository(EMSRequest)
    private readonly emsRequestRepo: Repository<EMSRequest>,
    @InjectRepository(Paramedic)
    private readonly paramedicRepo: Repository<Paramedic>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createRequest(createDto: CreateEmsRequestDto, patient: User): Promise<EMSRequest> {
    try {
      // Check if patient already has an active request
      const existingPatientRequest = await this.emsRequestRepo.findOne({
        where: {
          patient: { id: patient.id },
          status: In([EMSStatus.PENDING, EMSStatus.ENROUTE, EMSStatus.ARRIVED])
        },
        relations: ['patient']
      });

      if (existingPatientRequest) {
        throw new BadRequestException('You already have an active EMS request. Please wait for it to be completed or cancelled before creating a new one.');
      }

      const req = this.emsRequestRepo.create({
        ...createDto,
        patient,
        patientLat: createDto.lat,
        patientLng: createDto.lng,
        status: EMSStatus.PENDING,
      });

      const savedRequest = await this.emsRequestRepo.save(req);
      
      this.logger.log(`EMS request created: ${savedRequest.id} for patient: ${patient.id}`);
      return savedRequest;
    } catch (error) {
      this.logger.error(`Error creating EMS request: ${error.message}`);
      throw error;
    }
  }

  async updateParamedicLocation(requestId: string, paramedic: User, updateDto: UpdateLocationDto): Promise<EMSRequest> {
    const req = await this.emsRequestRepo.findOne({ 
      where: { id: requestId },
      relations: ['patient', 'paramedic']
    });
    
    if (!req) throw new NotFoundException('EMS Request not found');

    // Verify paramedic has permission to update this request
    if (req.paramedic?.id !== paramedic.id) {
      throw new BadRequestException('Unauthorized to update this request');
    }

    // Update paramedic location
    req.paramedicLat = updateDto.lat;
    req.paramedicLng = updateDto.lng;

    // Log location update
    this.logger.log(`Paramedic ${paramedic.id} location updated for request ${requestId}: ${updateDto.lat}, ${updateDto.lng}`);

    return this.emsRequestRepo.save(req);
  }

  async updateStatus(requestId: string, updateDto: UpdateStatusDto, user: User): Promise<EMSRequest> {
    const req = await this.emsRequestRepo.findOne({ 
      where: { id: requestId },
      relations: ['patient', 'paramedic']
    });
    
    if (!req) throw new NotFoundException('EMS Request not found');

    // Validate status transitions
    if (!this.isValidStatusTransition(req.status, updateDto.status)) {
      throw new BadRequestException(`Invalid status transition from ${req.status} to ${updateDto.status}`);
    }

    req.status = updateDto.status;
    req.notes = updateDto.notes || req.notes;

    // Update timestamps based on status
    switch (updateDto.status) {
      case EMSStatus.ENROUTE:
        req.dispatchTime = new Date();
        break;
      case EMSStatus.ARRIVED:
        req.arrivalTime = new Date();
        break;
      case EMSStatus.COMPLETED:
      case EMSStatus.CANCELLED:
        req.completionTime = new Date();
        break;
    }

    return this.emsRequestRepo.save(req);
  }

  async getRequest(requestId: string): Promise<EMSRequest> {
    const request = await this.emsRequestRepo.findOne({ 
      where: { id: requestId }, 
      relations: ['patient', 'paramedic']
    });
    
    if (!request) throw new NotFoundException('EMS Request not found');
    return request;
  }

  async getActiveRequests(): Promise<EMSRequest[]> {
    return this.emsRequestRepo.find({
      where: [
        { status: EMSStatus.PENDING },
        { status: EMSStatus.ENROUTE },
        { status: EMSStatus.ARRIVED }
      ],
      relations: ['patient', 'paramedic'],
      order: { priority: 'DESC', createdAt: 'ASC' }
    });
  }

  async getUserRequests(user: any) {
    // If user is a patient, find their patient profile and fetch requests for that patient
    if (user.role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({
        where: { user: { id: user.id } },
        relations: ['user']
      });

      if (patient) {
        const request = await this.emsRequestRepo.find({
          where: { patient: { id: patient.user.id } },
          relations: ['patient', 'paramedic'],
          order: { createdAt: 'DESC' }
        });
        return request
      }
      throw new NotFoundException('No profile');
    }

    // If user is a paramedic, find their paramedic profile and fetch requests for that paramedic
    if (user.role === UserRole.PARAMEDIC) {
      const paramedic = await this.paramedicRepo.findOne({
        where: { user: { id: user.id } },
        relations: ['user']
      });

      if (paramedic) {
        const request = await this.emsRequestRepo.find({
          where: { paramedic: { id: paramedic.user.id } },
          relations: ['patient', 'paramedic'],
          order: { createdAt: 'DESC' }
        });
        return request
      }
      throw new NotFoundException('No profile');
    }

    throw new NotFoundException('No roles');
  }

  // // Updated to accept user context and validate permissions
  // async assignParamedic(requestId: string, paramedicId: string, user?: any): Promise<EMSRequest> {
  //   const request = await this.emsRequestRepo.findOne({ 
  //     where: { id: requestId },
  //     relations: ['patient', 'paramedic']
  //   });
  //   if (!request) throw new NotFoundException('EMS Request not found');

  //   // For paramedics, they can only assign themselves
  //   if (user && user.role === UserRole.PARAMEDIC && user.id !== paramedicId) {
  //     throw new BadRequestException('Paramedics can only assign themselves to requests');
  //   }

  //   // Get the paramedic user directly by ID (since paramedicId is the user ID)
  //   const paramedicUser = await this.userRepo.findOne({ 
  //     where: { id: paramedicId, userRole: UserRole.PARAMEDIC }
  //   });
  //   if (!paramedicUser) throw new NotFoundException('Paramedic not found');

  //   // Check if paramedic already has an active request
  //   const existingParamedicRequest = await this.emsRequestRepo.findOne({
  //     where: {
  //       paramedic: { id: paramedicUser.id },
  //       status: In([EMSStatus.PENDING, EMSStatus.ENROUTE, EMSStatus.ARRIVED])
  //     },
  //     relations: ['paramedic']
  //   });

  //   if (existingParamedicRequest) {
  //     throw new BadRequestException('This paramedic is already assigned to an active EMS request. Please complete or cancel the current request first.');
  //   }

  //   // Check if request is already assigned
  //   if (request.paramedic) {
  //     throw new BadRequestException('This request is already assigned to another paramedic');
  //   }

  //   request.paramedic = paramedicUser;
  //   request.status = EMSStatus.ENROUTE;
  //   request.dispatchTime = new Date();

  //   const savedRequest = await this.emsRequestRepo.save(request);
  //   this.logger.log(`Paramedic ${paramedicUser.id} assigned to request ${requestId}`);
    
  //   return savedRequest;
  // }

  // Enhanced assign paramedic method that can optionally include initial location
  async assignParamedic(requestId: string, paramedicId: string, user?: any, initialLocation?: { lat: number; lng: number }): Promise<EMSRequest> {
    const request = await this.emsRequestRepo.findOne({ 
      where: { id: requestId },
      relations: ['patient', 'paramedic']
    });
    if (!request) throw new NotFoundException('EMS Request not found');

    // For paramedics, they can only assign themselves
    if (user && user.role === UserRole.PARAMEDIC && user.id !== paramedicId) {
      throw new BadRequestException('Paramedics can only assign themselves to requests');
    }

    // Get the paramedic user directly by ID
    const paramedicUser = await this.userRepo.findOne({ 
      where: { id: paramedicId, userRole: UserRole.PARAMEDIC }
    });
    if (!paramedicUser) throw new NotFoundException('Paramedic not found');

    // Check if paramedic already has an active request
    const existingParamedicRequest = await this.emsRequestRepo.findOne({
      where: {
        paramedic: { id: paramedicUser.id },
        status: In([EMSStatus.PENDING, EMSStatus.ENROUTE, EMSStatus.ARRIVED])
      },
      relations: ['paramedic']
    });

    if (existingParamedicRequest) {
      throw new BadRequestException('This paramedic is already assigned to an active EMS request. Please complete or cancel the current request first.');
    }

    // Check if request is already assigned
    if (request.paramedic) {
      throw new BadRequestException('This request is already assigned to another paramedic');
    }

    // Assign paramedic
    request.paramedic = paramedicUser;
    request.status = EMSStatus.ENROUTE;
    request.dispatchTime = new Date();

    // If initial location is provided, set it immediately
    if (initialLocation) {
      request.paramedicLat = initialLocation.lat;
      request.paramedicLng = initialLocation.lng;
      this.logger.log(`Initial paramedic location set: ${initialLocation.lat}, ${initialLocation.lng}`);
    }

    const savedRequest = await this.emsRequestRepo.save(request);
    this.logger.log(`Paramedic ${paramedicUser.id} assigned to request ${requestId}${initialLocation ? ' with initial location' : ''}`);
    
    return savedRequest;
  }

  // Add method to assign with location in one call
  async assignParamedicWithLocation(
    requestId: string, 
    paramedicId: string, 
    lat: number, 
    lng: number, 
    user?: any
  ): Promise<EMSRequest> {
    const request = await this.assignParamedic(requestId, paramedicId, user, { lat, lng });
    
    this.logger.log(`Paramedic ${paramedicId} assigned to request ${requestId} with location ${lat}, ${lng}`);
    
    return request;
  }

  // Helper method to check if a user can create a request
  async canUserCreateRequest(userId: string, userRole: UserRole): Promise<boolean> {
    const activeRequest = await this.emsRequestRepo.findOne({
      where: userRole === UserRole.PATIENT 
        ? { 
            patient: { id: userId },
            status: In([EMSStatus.PENDING, EMSStatus.ENROUTE, EMSStatus.ARRIVED])
          }
        : {
            paramedic: { id: userId },
            status: In([EMSStatus.PENDING, EMSStatus.ENROUTE, EMSStatus.ARRIVED])
          }
    });

    return !activeRequest;
  }

  // Helper method to get user's current active request
  async getUserActiveRequest(userId: string, userRole: UserRole): Promise<EMSRequest | null> {
    return await this.emsRequestRepo.findOne({
      where: userRole === UserRole.PATIENT 
        ? { 
            patient: { id: userId },
            status: In([EMSStatus.PENDING, EMSStatus.ENROUTE, EMSStatus.ARRIVED])
          }
        : {
            paramedic: { id: userId },
            status: In([EMSStatus.PENDING, EMSStatus.ENROUTE, EMSStatus.ARRIVED])
          },
      relations: ['patient', 'paramedic']
    });
  }

  private isValidStatusTransition(currentStatus: EMSStatus, newStatus: EMSStatus): boolean {
    const validTransitions: Record<EMSStatus, EMSStatus[]> = {
      [EMSStatus.PENDING]: [EMSStatus.ENROUTE, EMSStatus.CANCELLED],
      [EMSStatus.ENROUTE]: [EMSStatus.ARRIVED, EMSStatus.CANCELLED],
      [EMSStatus.ARRIVED]: [EMSStatus.COMPLETED, EMSStatus.CANCELLED],
      [EMSStatus.COMPLETED]: [],
      [EMSStatus.CANCELLED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}
