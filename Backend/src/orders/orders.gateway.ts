import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class OrdersGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('orders.subscribe')
  handleSubscribe(@ConnectedSocket() socket: Socket) {
    socket.join('kitchen');
  }

  notifyOrderCreated(order: { id: string }) {
    this.server.to('kitchen').emit('order.created', { orderId: order.id });
  }
}
