import { MessageType, MessageContext } from '../entities/message.entity';

export class MessageResponseDto {
  id: string;
  content: string;
  type: MessageType;
  context: MessageContext;
  conversationId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  isRead: boolean;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}