import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Headers,
  Req,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums';
import { User as UserDecorator } from 'src/auth/decorators/user.decorator';
import { User } from 'src/users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Initialize a new payment' })
  @ApiResponse({ status: 201, description: 'Payment initialized successfully' })
  async initializePayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @UserDecorator() user: User
  ) {
    return this.paymentsService.initializePayment(createPaymentDto, user);
  }

  @Post('verify/:reference')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Verify payment status' })
  @ApiResponse({ status: 200, description: 'Payment verification completed' })
  async verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: 200, description: 'Payment status updated successfully' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @UserDecorator() user: User
  ) {
    return this.paymentsService.updatePaymentStatus(id, status as any);
  }

  @Get()
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all payments for user' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async listPayments(@UserDecorator() user: User) {
    return this.paymentsService.listPayments(user);
  }

  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPaymentById(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.paymentsService.getPaymentById(id, user);
  }

  @Post(':id/refund')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  async refundPayment(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.paymentsService.refundPayment(id, user);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a pending payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  async cancelPayment(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.paymentsService.cancelPayment(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update payment details' })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  async updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @UserDecorator() user: User
  ) {
    return this.paymentsService.updatePayment(id, updatePaymentDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a payment record' })
  @ApiResponse({ status: 204, description: 'Payment deleted successfully' })
  async deletePayment(
    @Param('id') id: string,
    @UserDecorator() user: User
  ) {
    return this.paymentsService.deletePayment(id, user);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string
  ) {
    return this.paymentsService.handleWebhook(payload, signature);
  }
}
