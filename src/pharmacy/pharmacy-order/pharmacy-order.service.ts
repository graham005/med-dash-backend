import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { UpdatePharmacyOrderDto } from './dto/update-pharmacy-order.dto';
import { PharmacyOrder } from './entities/pharmacy-order.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { Prescription } from '../prescription/entities/prescription.entity';
import { OrderStatus } from 'src/enums';

@Injectable()
export class PharmacyOrderService {
  constructor(
      @InjectRepository(PharmacyOrder) private readonly pharmacyorderRepository: Repository<PharmacyOrder>,
      @InjectRepository(Prescription) private readonly prescriptionRepository: Repository<Prescription>
    ) {}
    async create(createPharmacyOrderDto: CreatePharmacyOrderDto) {
      const prescription = await this.prescriptionRepository.findOne({ where: { id: createPharmacyOrderDto.prescriptionId } })
      if(!prescription) {
        throw new NotFoundException('Prescription not found');
      }
      const newPharmacyOrder = this.pharmacyorderRepository.create({
       ...createPharmacyOrderDto
      });
      return this.pharmacyorderRepository.save(newPharmacyOrder)
    }
  
    async findAll() {
      const pharmacyorders = await this.pharmacyorderRepository.find()
      if(pharmacyorders.length === 0) {
        throw new NotFoundException('No PharmacyOrders Found')
      }
      return pharmacyorders;
    }
  
    async findOne(id: number) {
      const pharmacyorder = await this.pharmacyorderRepository.findOne({ where: { id: id.toString() } });
      if (!pharmacyorder) {
        throw new NotFoundException('PharmacyOrder not found');
      }
      return pharmacyorder;
    }
  
    async update(id: number, updatePharmacyOrderDto: UpdatePharmacyOrderDto) {
      return await this.pharmacyorderRepository.update(id, updatePharmacyOrderDto)
        .then((result) => {
          if (result.affected === 0) {
            throw new NotFoundException('PharmacyOrder not found.')
          }
        }).catch((error) => {
          console.error('Error updating pharmacyorder:', error)
          throw new Error(`Error uodating pharmacyorder: ${error.message}` )
        }).finally(() => {
          return this.findOne(id)
        })
    }
  
    async remove(id: number) {
      const pharmacyorder = await this.pharmacyorderRepository.findOne({ where: { id: id.toString() } });
      if (!pharmacyorder) {
        throw new NotFoundException('PharmacyOrder not found');
      }
      pharmacyorder.status = OrderStatus.CANCELLED;
      await this.pharmacyorderRepository.save(pharmacyorder);
      return pharmacyorder;
    }
}
