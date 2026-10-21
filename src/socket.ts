import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { corsOptions } from './config/cors.js';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket: Socket) => {
    // Unirse a la sala de una mesa específica
    socket.on('join_table', (data: { eventId: string; userName?: string }) => {
      if (!data || !data.eventId) return;
      const room = `mesa:${data.eventId}`;
      socket.join(room);
      console.log(`🔌 [Socket.io] Cliente ${socket.id} (${data.userName || 'Comensal'}) se unió a ${room}`);
      
      // Notificar a los demás comensales de la mesa
      socket.to(room).emit('comensal:activo', {
        id: socket.id,
        nombre: data.userName || 'Comensal'
      });
    });

    // Salir de la sala de la mesa
    socket.on('leave_table', (data: { eventId: string }) => {
      if (!data || !data.eventId) return;
      const room = `mesa:${data.eventId}`;
      socket.leave(room);
      console.log(`🔌 [Socket.io] Cliente ${socket.id} salió de ${room}`);
    });

    // Unirse a la sala personal de notificaciones de un usuario
    socket.on('join_user', (data: { userId: string }) => {
      if (!data || !data.userId) return;
      const room = `user:${data.userId}`;
      socket.join(room);
      console.log(`🔌 [Socket.io] Cliente ${socket.id} se unió a sala personal ${room}`);
    });

    socket.on('disconnect', () => {
      // desconectado
    });
  });

  console.log('⚡ [Socket.io] Servidor de WebSockets en tiempo real inicializado');
  return io;
};

export const getIO = (): Server | null => io;

/**
 * Emite una notificación de invitación personal al usuario invitado.
 */
export const broadcastUserInvite = (userId: string, payload: any): void => {
  if (!io) return;
  const room = `user:${userId}`;
  io.to(room).emit('invitacion:recibida', payload);
  console.log(`📩 [Socket.io] Invitación emitida a ${room}`);
};

export interface TableUpdatePayload {
  action: 'CONSUMO_CREADO' | 'CONSUMO_MODIFICADO' | 'CONSUMO_ELIMINADO' | 'COMENSAL_AGREGADO' | 'COMENSAL_ELIMINADO' | 'ABONO_REGISTRADO' | 'PROPINA_AGREGADA' | 'MESA_CERRADA' | 'TRANSACCION_ACTUALIZADA';
  eventoId: string;
  detalles?: any;
}

/**
 * Emite una actualización en vivo a todos los teléfonos y clientes sentados en la mesa.
 */
export const broadcastTableUpdate = (eventoId: string, payload: Omit<TableUpdatePayload, 'eventoId'>): void => {
  if (!io) return;
  const room = `mesa:${eventoId}`;
  const fullPayload: TableUpdatePayload = {
    ...payload,
    eventoId
  };

  io.to(room).emit('mesa:actualizada', fullPayload);
  console.log(`📡 [Socket.io] Evento emitido a ${room}: ${payload.action}`);
};
