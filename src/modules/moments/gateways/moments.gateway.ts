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

// Node
import { verify } from 'jsonwebtoken';

/**
 * WebSocket gateway for real-time moment analysis events.
 * Emits `moment.analyzed` when an AI analysis job completes so the
 * photographer dashboard can refresh without polling.
 *
 * Each client authenticates by sending their JWT in the `auth.token` field
 * of the socket handshake. On successful verification the socket joins a room
 * keyed by `user:<userId>`. Falls back gracefully — unauthenticated sockets
 * simply do not join a room and will not receive events.
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
    const token = (client.handshake.auth as Record<string, unknown>)?.token as string | undefined;

    if (!token) {
      this._logger.debug(`Client ${client.id} connected without token — no room joined`);
      return;
    }

    try {
      const secret = process.env.JWT_SECRET ?? '';
      const payload = verify(token, secret) as { sub?: string };
      const userId = payload.sub;

      if (userId) {
        void client.join(`user:${userId}`);
        this._logger.debug(`Client ${client.id} joined room user:${userId}`);
      }
    } catch {
      this._logger.debug(`Client ${client.id} provided invalid token`);
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
