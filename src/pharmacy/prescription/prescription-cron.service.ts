import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrescriptionService } from './prescription.service';

@Injectable()
export class PrescriptionCronService {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  // Run every day at midnight to check for expired prescriptions
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredPrescriptions() {
    console.log('Checking for expired prescriptions...');
    await this.prescriptionService.checkPrescriptionExpiry();
    console.log('Expired prescriptions check completed.');
  }
}