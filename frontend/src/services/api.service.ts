import {
  ApiResponse,
  UsuarioDTO,
  EventoDTO,
  EventoUsuarioItemDTO,
  EventoDetalleDTO,
  TransaccionDTO,
  CierreMesaDTO,
  CrearConsumoDTO,
  RegistrarPagoDTO,
  AgregarParticipanteDTO,
  ActualizarEstadoTransaccionDTO,
  CerrarMesaBodyDTO,
  ConsumoDTO,
  ActualizarConsumoDTO,
  AgregarPropinaDTO,
  ConsumoRegistradoDTO,
  ResumenFinancieroDTO,
  InvitacionMesaDTO
} from '../types/cabales.types';

const rawBase = import.meta.env.VITE_API_URL || '';
const BASE_URL = rawBase
  ? (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`)
  : '/api';

class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  try {
    const token = sessionStorage.getItem('cabales_jwt') || localStorage.getItem('cabales_jwt');
    const storedUser = sessionStorage.getItem('cabales_active_user') || localStorage.getItem('cabales_active_user');
    let activeUserId: string | null = null;

    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        activeUserId = u?.id || null;
      } catch {}
    }

    if (token) {
      let tokenUserId: string | null = null;
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(payloadBase64));
          tokenUserId = payload.id;
        }
      } catch {}

      // Solo adjuntar el token Bearer si pertenece al usuario activo de esta pestaña
      // Si el token es de otra cuenta (p.ej. iniciaste sesión con otra cuenta de Google en otra pestaña),
      // no lo enviamos para no causar 403 Forbidden por conflicto de identidad.
      const isTokenMatchingUser = !!tokenUserId && (!activeUserId || tokenUserId === activeUserId);
      if (isTokenMatchingUser && tokenUserId) {
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (!headers.has('X-User-Id')) {
          headers.set('X-User-Id', tokenUserId);
        }
      } else if (activeUserId && !headers.has('X-User-Id')) {
        headers.set('X-User-Id', activeUserId);
      }
    } else if (activeUserId && !headers.has('X-User-Id')) {
      headers.set('X-User-Id', activeUserId);
    }
  } catch {}

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let json: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    json = await response.json();
  }

  if (!response.ok) {
    const errorMsg = json?.message || json?.error || `Error ${response.status}: ${response.statusText}`;
    throw new ApiError(errorMsg, response.status, json);
  }

  return (json as ApiResponse<T>).data;
}

export const cabalesApi = {
  // --- USUARIOS ---
  async obtenerUsuarios(): Promise<UsuarioDTO[]> {
    return request<UsuarioDTO[]>('/users');
  },

  async crearUsuario(nombre: string, email: string): Promise<UsuarioDTO> {
    return request<UsuarioDTO>('/users', {
      method: 'POST',
      body: JSON.stringify({ nombre, email })
    });
  },

  async obtenerEventosUsuario(usuarioId: string): Promise<EventoUsuarioItemDTO[]> {
    return request<EventoUsuarioItemDTO[]>(`/users/${usuarioId}/events`);
  },

  async actualizarUsuario(
    usuarioId: string,
    body: { nombre?: string; avatar_url?: string; email?: string }
  ): Promise<UsuarioDTO> {
    return request<UsuarioDTO>(`/users/${usuarioId}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  // --- EVENTOS ---
  async crearEvento(nombre: string, creadorId: string): Promise<EventoDTO> {
    return request<EventoDTO>('/events', {
      method: 'POST',
      body: JSON.stringify({
        nombre,
        creador_id: creadorId,
        auto_incluir_creador: true
      })
    });
  },

  async obtenerDetalleEvento(eventoId: string): Promise<EventoDetalleDTO> {
    return request<EventoDetalleDTO>(`/events/${eventoId}`);
  },

  async eliminarEvento(eventoId: string): Promise<any> {
    return request<any>(`/events/${eventoId}`, {
      method: 'DELETE'
    });
  },

  // --- PARTICIPANTES ---
  async agregarParticipante(eventoId: string, data: AgregarParticipanteDTO): Promise<any> {
    return request<any>(`/events/${eventoId}/participants`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async reclamarParticipante(
    eventoId: string,
    participanteId: string,
    usuarioId: string
  ): Promise<any> {
    return request<any>(`/events/${eventoId}/participants/${participanteId}/claim`, {
      method: 'PATCH',
      body: JSON.stringify({ usuario_id: usuarioId })
    });
  },

  async eliminarParticipante(eventoId: string, participanteId: string): Promise<any> {
    return request<any>(`/events/${eventoId}/participants/${participanteId}`, {
      method: 'DELETE'
    });
  },

  // --- CONSUMOS ---
  async obtenerConsumos(eventoId: string): Promise<ConsumoDTO[]> {
    return request<ConsumoDTO[]>(`/events/${eventoId}/consumptions`);
  },

  async registrarConsumo(eventoId: string, data: CrearConsumoDTO): Promise<ConsumoRegistradoDTO> {
    return request<ConsumoRegistradoDTO>(`/events/${eventoId}/consumptions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async actualizarConsumo(
    eventoId: string,
    consumoId: string,
    data: ActualizarConsumoDTO
  ): Promise<ConsumoRegistradoDTO> {
    return request<ConsumoRegistradoDTO>(`/events/${eventoId}/consumptions/${consumoId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async eliminarConsumo(eventoId: string, consumoId: string): Promise<any> {
    return request<any>(`/events/${eventoId}/consumptions/${consumoId}`, {
      method: 'DELETE'
    });
  },

  async agregarPropina(eventoId: string, data: AgregarPropinaDTO): Promise<ConsumoRegistradoDTO> {
    return request<ConsumoRegistradoDTO>(`/events/${eventoId}/tip`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // --- PAGOS ---
  async registrarPago(eventoId: string, data: RegistrarPagoDTO): Promise<any> {
    return request<any>(`/events/${eventoId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // --- TRANSACCIONES ---
  async obtenerTransacciones(eventoId: string): Promise<TransaccionDTO[]> {
    return request<TransaccionDTO[]>(`/events/${eventoId}/transactions`);
  },

  async actualizarEstadoTransaccion(
    transaccionId: string,
    data: ActualizarEstadoTransaccionDTO
  ): Promise<TransaccionDTO> {
    return request<TransaccionDTO>(`/transactions/${transaccionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async subirComprobante(transaccionId: string, archivo: File): Promise<TransaccionDTO> {
    const formData = new FormData();
    formData.append('comprobante', archivo);

    return request<TransaccionDTO>(`/transactions/${transaccionId}/comprobante`, {
      method: 'POST',
      body: formData
    });
  },

  resolverUrlComprobante(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const host = BASE_URL.replace(/\/api\/?$/, '');
    return `${host}${url.startsWith('/') ? '' : '/'}${url}`;
  },

  // --- CIERRE DE MESA (GREEDY SETTLEMENT) ---
  async cerrarEvento(eventoId: string, body: CerrarMesaBodyDTO = {}): Promise<CierreMesaDTO> {
    return request<CierreMesaDTO>(`/events/${eventoId}/close`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  // --- ANALÍTICAS & FINANZAS PERSONALES ---
  async obtenerResumenFinanciero(usuarioId: string): Promise<ResumenFinancieroDTO> {
    return request<ResumenFinancieroDTO>(`/users/${usuarioId}/financial-summary`);
  },

  // --- RECLAMO / VINCULACIÓN DE MESAS ANÓNIMAS ---
  async reclamarEventosInvitado(
    usuarioId: string,
    data: { event_ids?: string[]; guest_user_id?: string } | string[]
  ): Promise<{ sincronizados: number }> {
    const body = Array.isArray(data) ? { event_ids: data } : data;
    return request<{ sincronizados: number }>(`/users/${usuarioId}/claim-events`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  // --- INVITACIONES A MESAS ---
  async obtenerMisInvitaciones(): Promise<InvitacionMesaDTO[]> {
    return request<InvitacionMesaDTO[]>('/invitations');
  },

  async aceptarInvitacion(invitacionId: string): Promise<{ evento_id: string }> {
    return request<{ evento_id: string }>(`/invitations/${invitacionId}/accept`, {
      method: 'POST'
    });
  },

  async rechazarInvitacion(invitacionId: string): Promise<void> {
    return request<void>(`/invitations/${invitacionId}/reject`, {
      method: 'POST'
    });
  }
};

export const authApi = {
  loginWithGoogle: async (idToken: string, guestUserId?: string) => {
    return request<{ user: UsuarioDTO; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, guest_user_id: guestUserId })
    });
  },

  loginAsGuest: async (nombreInvitado?: string) => {
    return request<{ user: UsuarioDTO; token: string }>('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ nombre_invitado: nombreInvitado })
    });
  },

  devLogin: async (email: string, guestUserId?: string) => {
    return request<{ user: UsuarioDTO; token: string }>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, guest_user_id: guestUserId })
    });
  },

  getMe: async () => {
    return request<{ user: UsuarioDTO }>('/auth/me');
  }
};

