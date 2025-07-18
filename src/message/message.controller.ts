import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { MessagingService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageContext } from './entities/message.entity';
import { User as UserDecorator } from 'src/auth/decorators/user.decorator';
import { User } from 'src/users/entities/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums';

@Controller('messaging')
@UseGuards(RolesGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.PHARMACIST)
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @UserDecorator() user: User,
  ) {
    return this.messagingService.createMessage(createMessageDto, user);
  }

  @Get('conversations')
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.PHARMACIST)
  async getUserConversations(@UserDecorator() user: User) {
    return this.messagingService.getUserConversations(user);
  }

  @Get('conversations/:context/:conversationId')
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.PHARMACIST)
  async getConversationMessages(
    @Param('context', new ParseEnumPipe(MessageContext)) context: MessageContext,
    @Param('conversationId') conversationId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @UserDecorator() user: User,
  ) {
    return this.messagingService.getConversationMessages(context, conversationId, user, page, limit);
  }
}