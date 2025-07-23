import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/ems', cors: true })
export class EMSGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(EMSGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Patient shares location
  @SubscribeMessage('patient-location')
  handlePatientLocation(@MessageBody() data: { requestId: string; lat: number; lng: number }) {
    this.server.to(data.requestId).emit('patient-location-update', data);
    this.logger.log(`Patient location update for request: ${data.requestId}`);
  }

  // Paramedic shares location
  @SubscribeMessage('paramedic-location')
  handleParamedicLocation(@MessageBody() data: { requestId: string; lat: number; lng: number }) {
    this.server.to(data.requestId).emit('paramedic-location-update', data);
    this.logger.log(`Paramedic location update for request: ${data.requestId}`);
  }

  // Status updates
  @SubscribeMessage('status-update')
  handleStatusUpdate(@MessageBody() data: { requestId: string; status: string; message?: string }) {
    this.server.to(data.requestId).emit('status-changed', data);
    this.logger.log(`Status update for request: ${data.requestId} - ${data.status}`);
  }

  // Emergency alerts
  @SubscribeMessage('emergency-alert')
  handleEmergencyAlert(@MessageBody() data: { requestId: string; priority: string; message: string }) {
    // Broadcast to all connected paramedics
    this.server.emit('new-emergency', data);
    this.logger.log(`Emergency alert broadcasted for request: ${data.requestId}`);
  }

  // Join EMS room for real-time updates
  @SubscribeMessage('join-ems-room')
  handleJoinRoom(@MessageBody() data: { requestId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.requestId);
    this.logger.log(`Client ${client.id} joined room: ${data.requestId}`);
  }

  // Leave EMS room
  @SubscribeMessage('leave-ems-room')
  handleLeaveRoom(@MessageBody() data: { requestId: string }, @ConnectedSocket() client: Socket) {
    client.leave(data.requestId);
    this.logger.log(`Client ${client.id} left room: ${data.requestId}`);
  }

  // Broadcast new request to available paramedics
  broadcastNewRequest(requestData: any) {
    this.server.emit('new-ems-request', requestData);
  }

  // Send status update to specific room
  sendStatusUpdate(requestId: string, statusData: any) {
    this.server.to(requestId).emit('status-changed', statusData);
  }
}