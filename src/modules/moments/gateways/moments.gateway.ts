// NestJS Libraries
import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

// Socket.IO
import type { Server, Socket } from 'socket.io';

/**
 * WebSocket gateway for real-time moment analysis events.
 * Emits `moment.analyzed` when an AI analysis job completes so the
 * photographer dashboard can refresh without polling.
 *
 * Clients join a room keyed by their userId. The gateway requires no
 * auth middleware here — the actual authentication happens in the HTTP
 * layer before the photographer can upload. Room membership is
 * established by the client sending a `join` event with their userId.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/moments',
})
export class MomentsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly _server!: Server;

  private readonly _logger = new Logger(MomentsGateway.name);

  public afterInit(): void {
    this._logger.log('MomentsGateway initialised');
  }

  public handleConnection(client: Socket): void {
    const userId = client.handshake.query['userId'] as string | undefined;

    if (userId) {
      void client.join(`user:${userId}`);
      this._logger.debug(`Client ${client.id} joined room user:${userId}`);
    }
  }

  public handleDisconnect(client: Socket): void {
    this._logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit to the photographer whose moment was just analysed.
   * Called by AiAnalysisService after a successful or failed run.
   */
  public emitMomentAnalyzed(
    photographerId: string,
    momentId: string,
    status: 'ready' | 'failed',
  ): void {
    this._server.to(`user:${photographerId}`).emit('moment.analyzed', { momentId, status });
  }
}
