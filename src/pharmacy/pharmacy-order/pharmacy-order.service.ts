import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { UpdatePharmacyOrderDto } from './dto/update-pharmacy-order.dto';
import { PharmacyOrder } from './entities/pharmacy-order.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pharmacist } from 'src/users/entities/pharmacist.entity';
import { Prescription } from '../prescription/entities/prescription.entity';
import { OrderStatus } from 'src/enums';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class PharmacyOrderService {
  constructor(
      @InjectRepository(PharmacyOrder) private readonly pharmacyorderRepository: Repository<PharmacyOrder>,
      @InjectRepository(Prescription) private readonly prescriptionRepository: Repository<Prescription>,
      @InjectRepository(Pharmacist) private readonly pharmacistRepository: Repository<Pharmacist>
    ) {}
    async create(createPharmacyOrderDto: CreatePharmacyOrderDto, user: User) {
      const pharmacist = await this.pharmacistRepository.findOne({
        where: {
          user:{
            id: user.id
          }
        }
      })
      if(!pharmacist){
        throw new NotFoundException('Pharmacist profile not found')
      }
      const prescription = await this.prescriptionRepository.findOne({ where: { id: createPharmacyOrderDto.prescriptionId } })
      if(!prescription) {
        throw new NotFoundException('Prescription not found');
      }
      const newPharmacyOrder = this.pharmacyorderRepository.create({
       ...createPharmacyOrderDto,
       pharmacist
       
      });
      return this.pharmacyorderRepository.save(newPharmacyOrder)
    }
  
    async findAll(user: User) {
      const pharmacyorders = await this.pharmacyorderRepository.find({
        where: {
         pharmacist: {
          user: {
            id: user.id
          }
         }
        }
      })
      if(pharmacyorders.length === 0) {
        throw new NotFoundException('No PharmacyOrders Found')
      }
      return pharmacyorders;
    }
  
    async findOne(id: string, user: User) {
      const pharmacyorder = await this.pharmacyorderRepository.findOne({ 
        where: {
           id: id,
           pharmacist: {
            user: {
              id: user.id
            }
           }
          } 
      });
      if (!pharmacyorder) {
        throw new NotFoundException('PharmacyOrder not found');
      }
      return pharmacyorder;
    }
  
    async update(id: string, updatePharmacyOrderDto: UpdatePharmacyOrderDto, user: User) {
      const pharmacist = await this.pharmacistRepository.findOne({
        where: {
          user:{
            id: user.id
          }
        }
      })
      if(!pharmacist){
        throw new NotFoundException('Pharmacist profile not found')
      }
      return await this.pharmacyorderRepository.update(id, updatePharmacyOrderDto)
        .then((result) => {
          if (result.affected === 0) {
            throw new NotFoundException('PharmacyOrder not found.')
          }
        }).catch((error) => {
          console.error('Error updating pharmacyorder:', error)
          throw new Error(`Error uodating pharmacyorder: ${error.message}` )
        }).finally(() => {
          return this.findOne(id, user)
        })
    }
  
    async remove(id: string, user: User) {
      const pharmacist = await this.pharmacistRepository.findOne({
        where: {
          user: {
            id: user.id
          }
        }
      });
      if (!pharmacist) {
        throw new NotFoundException('Pharmacist profile not found');
      }

      const pharmacyorder = await this.pharmacyorderRepository.findOne({
        where: {
          id,
          pharmacist: {
            id: pharmacist.id
          }
        }
      });

      if (!pharmacyorder) {
        throw new NotFoundException('PharmacyOrder not found');
      }

      pharmacyorder.status = OrderStatus.CANCELLED;
      await this.pharmacyorderRepository.save(pharmacyorder);
      return pharmacyorder;
    }
}
