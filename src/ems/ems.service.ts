import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async createRequest(createDto: CreateEmsRequestDto, patient: User): Promise<EMSRequest> {
    try {
      const req = this.emsRequestRepo.create({
        ...createDto,
        patient,
        patientLat: createDto.lat,
        patientLng: createDto.lng,
        status: EMSStatus.PENDING,
      });

      const savedRequest = await this.emsRequestRepo.save(req);
      
      // Auto-assign paramedic based on priority and location
      // this.autoAssignParamedic(savedRequest.id, createDto.lat, createDto.lng, createDto.priority);
      
      this.logger.log(`EMS request created: ${savedRequest.id} for patient: ${patient.firstName}`);
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

    req.paramedic = paramedic;
    req.paramedicLat = updateDto.lat;
    req.paramedicLng = updateDto.lng;

    // Auto-update status if paramedic is approaching
    if (req.status === EMSStatus.PENDING) {
      req.status = EMSStatus.ENROUTE;
      req.dispatchTime = new Date();
    }

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
    console.log(request)
    
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
      // If no patient profile, return empty array
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
      // If no paramedic profile, return empty array
      throw new NotFoundException('No profile');
    }

    // For other roles, return empty array
      throw new NotFoundException('No roles');
  }

  async assignParamedic(requestId: string, paramedicId: string): Promise<EMSRequest> {
    const request = await this.emsRequestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('EMS Request not found');

    const paramedic = await this.paramedicRepo.findOne({ 
      where: { id: paramedicId },
      relations: ['user']
    });
    if (!paramedic) throw new NotFoundException('Paramedic not found');

    request.paramedic = paramedic.user;
    request.status = EMSStatus.ENROUTE;
    request.dispatchTime = new Date();

    return this.emsRequestRepo.save(request);
  }

  private async autoAssignParamedic(requestId: string, lat: number, lng: number, priority: any): Promise<void> {
    // Simple auto-assignment logic - in production, you'd use more sophisticated algorithms
    const availableParamedics = await this.paramedicRepo.find({
      relations: ['user']
    });

    if (availableParamedics.length > 0) {
      // For now, assign the first available paramedic
      // In production, you'd consider location, availability, workload, etc.
      const paramedic = availableParamedics[0];
      await this.assignParamedic(requestId, paramedic.id);
    }
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
