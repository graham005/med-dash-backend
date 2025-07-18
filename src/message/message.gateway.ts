import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { MessagingService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/messaging',
})
@Injectable()
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private userSockets = new Map<string, AuthenticatedSocket>(); // socketId -> socket

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn('Client connected without token');
        client.disconnect();
        return;
      }

      // Verify and decode JWT
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });

      if (!user) {
        this.logger.warn('Invalid user in token');
        client.disconnect();
        return;
      }

      client.user = user;
      this.connectedUsers.set(user.id, client.id);
      this.userSockets.set(client.id, client);

      this.logger.log(`User ${user.firstName} ${user.lastName} connected with socket ${client.id}`);

      // Join user to their conversation rooms
      await this.joinUserConversations(client, user);

    } catch (error) {
      this.logger.error('Error during connection:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.connectedUsers.delete(client.user.id);
      this.userSockets.delete(client.id);
      this.logger.log(`User ${client.user.firstName} ${client.user.lastName} disconnected`);
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    try {
      if (!client.user) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Save message to database
      const message = await this.messagingService.createMessage(createMessageDto, client.user);

      // Emit to sender
      client.emit('message-sent', message);

      // Emit to receiver if online
      const receiverSocketId = this.connectedUsers.get(createMessageDto.receiverId);
      if (receiverSocketId) {
        const receiverSocket = this.userSockets.get(receiverSocketId);
        receiverSocket?.emit('new-message', message);
      }

      // Emit to conversation room
      const roomName = `${createMessageDto.context}-${createMessageDto.conversationId}`;
      client.to(roomName).emit('conversation-message', message);

      this.logger.log(`Message sent from ${client.user.id} to ${createMessageDto.receiverId} in ${roomName}`);

    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: error.message || 'Failed to send message' });
    }
  }

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { context: string; conversationId: string },
  ) {
    try {
      if (!client.user) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const roomName = `${data.context}-${data.conversationId}`;
      await client.join(roomName);
      
      this.logger.log(`User ${client.user.id} joined conversation ${roomName}`);
      client.emit('joined-conversation', { room: roomName });

    } catch (error) {
      this.logger.error('Error joining conversation:', error);
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leave-conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { context: string; conversationId: string },
  ) {
    try {
      const roomName = `${data.context}-${data.conversationId}`;
      await client.leave(roomName);
      
      this.logger.log(`User ${client.user?.id} left conversation ${roomName}`);
      client.emit('left-conversation', { room: roomName });

    } catch (error) {
      this.logger.error('Error leaving conversation:', error);
      client.emit('error', { message: 'Failed to leave conversation' });
    }
  }

  @SubscribeMessage('typing-start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { context: string; conversationId: string; receiverId: string },
  ) {
    if (!client.user) return;

    const roomName = `${data.context}-${data.conversationId}`;
    client.to(roomName).emit('user-typing', {
      userId: client.user.id,
      userName: `${client.user.firstName} ${client.user.lastName}`,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { context: string; conversationId: string; receiverId: string },
  ) {
    if (!client.user) return;

    const roomName = `${data.context}-${data.conversationId}`;
    client.to(roomName).emit('user-typing', {
      userId: client.user.id,
      userName: `${client.user.firstName} ${client.user.lastName}`,
      isTyping: false,
    });
  }

  private async joinUserConversations(client: AuthenticatedSocket, user: User) {
    try {
      // Get user's conversations and join them to appropriate rooms
      const conversations = await this.messagingService.getUserConversations(user);

      // Join appointment conversation rooms
      for (const conversation of conversations.appointments) {
        const roomName = `appointment-${conversation.id}`;
        await client.join(roomName);
      }

      // Join pharmacy order conversation rooms
      for (const conversation of conversations.pharmacyOrders) {
        const roomName = `pharmacy_order-${conversation.id}`;
        await client.join(roomName);
      }

      this.logger.log(`User ${user.id} joined ${conversations.appointments.length + conversations.pharmacyOrders.length} conversation rooms`);

    } catch (error) {
      this.logger.error('Error joining user conversations:', error);
    }
  }

  // Method to notify users about new appointments or orders
  async notifyNewConversation(userId: string, conversationData: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.userSockets.get(socketId);
      socket?.emit('new-conversation', conversationData);
    }
  }
}