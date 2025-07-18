import { Body, Controller, Post, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { HealthBotService, BotResponse } from './health-bot.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums';
import { Public } from 'src/auth/decorators/public.decorator';

interface BotRequest {
  question: string;
}

interface BotControllerResponse {
  success: boolean;
  data: BotResponse;
  timestamp: string;
  requestId?: string;
}

interface HealthCheckResponse {
  status: string;
  knowledgeBaseSize: number;
  lastUpdate: Date;
  timestamp: string;
}

@Controller('health-bot')
@UseGuards(RolesGuard)
export class HealthBotController {
  constructor(private readonly botService: HealthBotService) {}

  @Public()
  @Post('ask')
  async askQuestion(@Body() body: BotRequest): Promise<BotControllerResponse> {
    try {
      // Validate request
      if (!body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
        throw new HttpException(
          'Question is required and must be a non-empty string',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Sanitize input
      const sanitizedQuestion = body.question.trim().substring(0, 1000); // Limit question length

      // Get response from service
      const botResponse = await this.botService.askQuestion(sanitizedQuestion);

      return {
        success: true,
        data: botResponse,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to process your question. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('health')
  async getHealthStatus(): Promise<HealthCheckResponse> {
    try {
      const health = await this.botService.getServiceHealth();
      
      return {
        ...health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        'Unable to retrieve service health status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // For authenticated users - could add conversation history, etc.
  @Roles(UserRole.PATIENT)
  @Post('ask-authenticated')
  async askQuestionAuthenticated(@Body() body: BotRequest): Promise<BotControllerResponse> {
    try {
      if (!body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
        throw new HttpException(
          'Question is required and must be a non-empty string',
          HttpStatus.BAD_REQUEST,
        );
      }

      const sanitizedQuestion = body.question.trim().substring(0, 1000);
      const botResponse = await this.botService.askQuestion(sanitizedQuestion);

      // For authenticated users, you could:
      // - Store conversation history
      // - Provide personalized responses
      // - Access user's medical history (with proper permissions)
      // - Send escalation notifications to their healthcare providers

      return {
        success: true,
        data: {
          ...botResponse,
          // Could add user-specific context here
        },
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to process your question. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Emergency endpoint - always public for urgent situations
  @Public()
  @Post('emergency')
  async handleEmergency(@Body() body: { situation: string }): Promise<BotControllerResponse> {
    try {
      if (!body.situation || typeof body.situation !== 'string') {
        throw new HttpException(
          'Emergency situation description is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Always treat as emergency and escalate
      const emergencyResponse: BotResponse = {
        answer: "🚨 This appears to be a medical emergency. Please call emergency services immediately (911/112) or go to the nearest emergency room. Do not delay seeking immediate medical attention.",
        confidence: 1.0,
        sources: ['Emergency Protocol'],
        escalate: true,
        reasoning: 'Emergency endpoint accessed'
      };

      // In a real implementation, you might:
      // - Log emergency situations
      // - Notify emergency contacts
      // - Provide location-based emergency services info
      // - Send alerts to healthcare providers

      return {
        success: true,
        data: emergencyResponse,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Emergency service temporarily unavailable. Please call 911/112 directly.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
