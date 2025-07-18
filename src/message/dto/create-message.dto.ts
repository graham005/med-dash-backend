import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { MessageType, MessageContext } from '../entities/message.entity';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @IsEnum(MessageContext)
  context: MessageContext;

  @IsUUID()
  conversationId: string; // appointment.id or pharmacy_order.id

  @IsUUID()
  receiverId: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}
