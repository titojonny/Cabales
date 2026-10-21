import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    // Usar la misma URL / origen del cliente, Vite proxiea /socket.io a localhost:3000
    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
      : window.location.origin;

    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log('⚡ [WebSockets] Conectado en tiempo real a Cabales:', socketInstance?.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 [WebSockets] Desconectado:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('⚠️ [WebSockets] Error de conexión:', error.message);
    });
  }
  return socketInstance;
};

export interface TableUpdateEvent {
  action: 'CONSUMO_CREADO' | 'CONSUMO_MODIFICADO' | 'CONSUMO_ELIMINADO' | 'COMENSAL_AGREGADO' | 'COMENSAL_ELIMINADO' | 'ABONO_REGISTRADO' | 'PROPINA_AGREGADA' | 'MESA_CERRADA' | 'TRANSACCION_ACTUALIZADA';
  eventoId: string;
  detalles?: any;
}

/**
 * Hook de React para sincronizar la mesa en vivo vía WebSockets.
 * Se suscribe automáticamente a la sala `mesa:${eventId}` y dispara `onUpdate`
 * cuando cualquier participante en cualquier dispositivo realiza una modificación.
 */
export const useTableSocket = (
  eventId: string | undefined,
  onUpdate?: (event: TableUpdateEvent) => void,
  currentUserName?: string
) => {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!eventId) return;

    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Unirse a la sala de esta mesa
    socket.emit('join_table', {
      eventId,
      userName: currentUserName || 'Comensal'
    });

    const handleTableUpdate = (payload: TableUpdateEvent) => {
      if (payload.eventoId === eventId) {
        console.log('📡 [WebSockets] Actualización recibida de la mesa:', payload.action);
        if (callbackRef.current) {
          callbackRef.current(payload);
        }
      }
    };

    socket.on('mesa:actualizada', handleTableUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('mesa:actualizada', handleTableUpdate);
      socket.emit('leave_table', { eventId });
    };
  }, [eventId, currentUserName]);

  return { isConnected };
};

export interface UserInvitationEvent {
  type: 'INVITACION_MESA';
  invitacion: {
    id: string;
    evento_id: string;
    nombre_mesa: string;
    anfitrion_nombre: string;
    creado_en: string;
  };
}

/**
 * Hook para recibir notificaciones en tiempo real de invitaciones a sentarse en mesas.
 */
export const useUserInvitationsSocket = (
  userId: string | undefined,
  onInvite?: (event: UserInvitationEvent) => void
) => {
  const callbackRef = useRef(onInvite);
  callbackRef.current = onInvite;

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();

    const joinRoom = () => {
      socket.emit('join_user', { userId });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on('connect', joinRoom);

    const handleInvite = (payload: UserInvitationEvent) => {
      console.log('📩 [WebSockets] Nueva invitación recibida:', payload);
      if (callbackRef.current) {
        callbackRef.current(payload);
      }
    };

    socket.on('invitacion:recibida', handleInvite);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('invitacion:recibida', handleInvite);
    };
  }, [userId]);
};
