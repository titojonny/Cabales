import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UsuarioDTO } from '../types/cabales.types';
import { cabalesApi, authApi } from '../services/api.service';

const STORAGE_KEY_USER = 'cabales_active_user';
const STORAGE_KEY_TOKEN = 'cabales_jwt';
const STORAGE_KEY_BANK = 'cabales_default_bank_details';
const STORAGE_KEY_GUEST_EVENTS = 'cabales_guest_event_ids';

interface AuthContextType {
  currentUser: UsuarioDTO | null;
  currentUserId: string;
  currentUserName: string;
  isLoggedIn: boolean;
  isGuest: boolean;
  hasFullAccount: boolean;
  bankDetails: string;
  setBankDetails: (details: string) => void;
  setCurrentUser: (user: UsuarioDTO, token?: string) => void;
  loginWithGoogle: (idToken: string) => Promise<UsuarioDTO>;
  startGuestSession: (nombre?: string) => Promise<UsuarioDTO>;
  devLogin: (email: string) => Promise<UsuarioDTO>;
  registerOrLogin: (nombre: string, email?: string) => Promise<UsuarioDTO>;
  loginWithEmailOrName: (identifier: string) => Promise<UsuarioDTO>;
  updateCurrentUserName: (nuevoNombre: string) => Promise<UsuarioDTO>;
  trackGuestEvent: (eventId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<UsuarioDTO | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.id !== 'default-user-id') {
          return parsed;
        }
      }
    } catch {
      // Ignorar error de parsing
    }
    return null;
  });

  const [bankDetails, setBankDetailsState] = useState<string>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_BANK) || localStorage.getItem(STORAGE_KEY_BANK) || '';
    } catch {
      return '';
    }
  });

  const isGuest = !!currentUser && currentUser.email.includes('@guest.cabales.app');
  const hasFullAccount = !!currentUser && !isGuest;

  // Al montar, si hay token pero no sincronizado con el backend, refrescar perfil
  useEffect(() => {
    const token = sessionStorage.getItem(STORAGE_KEY_TOKEN) || localStorage.getItem(STORAGE_KEY_TOKEN);
    if (token) {
      authApi.getMe()
        .then((res: any) => {
          const user = res?.user || res?.data?.user || res?.data || res;
          if (user && user.id) {
            setCurrentUserState(user);
            sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
            sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
            localStorage.setItem(STORAGE_KEY_TOKEN, token);
          }
        })
        .catch(() => {
          // Token expirado o inválido: descartarlo
          sessionStorage.removeItem(STORAGE_KEY_TOKEN);
          localStorage.removeItem(STORAGE_KEY_TOKEN);
        });
    }
  }, []);

  const setCurrentUser = useCallback((user: UsuarioDTO, token?: string) => {
    setCurrentUserState(user);
    try {
      sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      if (token) {
        sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
      } else {
        // Validar si el token almacenado pertenece a este usuario
        const existingToken = sessionStorage.getItem(STORAGE_KEY_TOKEN) || localStorage.getItem(STORAGE_KEY_TOKEN);
        if (existingToken) {
          try {
            const parts = existingToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              if (payload.id !== user.id) {
                // Token de otro usuario: eliminar inmediatamente de esta pestaña
                sessionStorage.removeItem(STORAGE_KEY_TOKEN);
              } else {
                sessionStorage.setItem(STORAGE_KEY_TOKEN, existingToken);
              }
            }
          } catch {
            sessionStorage.removeItem(STORAGE_KEY_TOKEN);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUserState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY_USER);
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
      sessionStorage.removeItem(STORAGE_KEY_GUEST_EVENTS);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_GUEST_EVENTS);
    } catch {
      // ignore
    }
  }, []);

  const setBankDetails = useCallback((details: string) => {
    const trimmed = details.trim();
    setBankDetailsState(trimmed);
    try {
      localStorage.setItem(STORAGE_KEY_BANK, trimmed);
    } catch {
      // ignore
    }
  }, []);

  const trackGuestEvent = useCallback((eventId: string) => {
    try {
      // Solo almacenar eventos temporales para usuarios en modo invitado sin cuenta registrada
      const storedUser = localStorage.getItem(STORAGE_KEY_USER);
      let isUserGuest = true;
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          isUserGuest = parsed?.email ? parsed.email.includes('@guest.cabales.app') : true;
        } catch {}
      }

      if (!isUserGuest) return;

      const stored = localStorage.getItem(STORAGE_KEY_GUEST_EVENTS);
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(eventId)) {
        list.push(eventId);
        localStorage.setItem(STORAGE_KEY_GUEST_EVENTS, JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  }, []);

  // Autenticación oficial con Google OAuth
  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<UsuarioDTO> => {
      const guestId = isGuest ? currentUser?.id : undefined;
      const res: any = await authApi.loginWithGoogle(idToken, guestId);
      const user = res?.user || res?.data?.user;
      const token = res?.token || res?.data?.token;

      // Vincular eventos temporales previos si los había
      try {
        const stored = localStorage.getItem(STORAGE_KEY_GUEST_EVENTS);
        if (stored) {
          const list: string[] = JSON.parse(stored);
          if (list.length > 0) {
            await cabalesApi.reclamarEventosInvitado(user.id, { event_ids: list });
          }
          localStorage.removeItem(STORAGE_KEY_GUEST_EVENTS);
        }
      } catch {}

      setCurrentUser(user, token);
      return user;
    },
    [currentUser, isGuest, setCurrentUser]
  );

  // Sesión rápida de invitado sin registro (1-tap anonymous) con JWT firmado
  const startGuestSession = useCallback(
    async (nombre = 'Invitado'): Promise<UsuarioDTO> => {
      const trimmed = nombre.trim() || 'Invitado';
      const res: any = await authApi.loginAsGuest(trimmed);
      const user = res?.user || res?.data?.user;
      const token = res?.token || res?.data?.token;
      setCurrentUser(user, token);
      return user;
    },
    [setCurrentUser]
  );

  // Login de desarrollo y demostración (simula Google con 1 clic)
  const devLogin = useCallback(
    async (email: string): Promise<UsuarioDTO> => {
      const guestId = isGuest ? currentUser?.id : undefined;
      const res: any = await authApi.devLogin(email, guestId);
      const user = res?.user || res?.data?.user;
      const token = res?.token || res?.data?.token;

      try {
        const stored = localStorage.getItem(STORAGE_KEY_GUEST_EVENTS);
        if (stored) {
          const list: string[] = JSON.parse(stored);
          if (list.length > 0) {
            await cabalesApi.reclamarEventosInvitado(user.id, { event_ids: list });
          }
          localStorage.removeItem(STORAGE_KEY_GUEST_EVENTS);
        }
      } catch {}

      setCurrentUser(user, token);
      return user;
    },
    [currentUser, isGuest, setCurrentUser]
  );

  // Registro formal tradicional de respaldo
  const registerOrLogin = useCallback(
    async (nombre: string, customEmail?: string): Promise<UsuarioDTO> => {
      const trimmed = nombre.trim();
      if (!trimmed) {
        throw new Error('El nombre no puede estar vacío');
      }

      const emailInput = customEmail?.trim().toLowerCase();

      if (currentUser && isGuest) {
        const guestId = currentUser.id;

        if (emailInput) {
          const usuarios = await cabalesApi.obtenerUsuarios();
          const cuentaExistente = usuarios.find(
            (u) => u.email.toLowerCase() === emailInput && !u.email.includes('@guest.cabales.app')
          );

          if (cuentaExistente) {
            await cabalesApi.reclamarEventosInvitado(cuentaExistente.id, {
              guest_user_id: guestId
            });
            setCurrentUser(cuentaExistente);
            try {
              localStorage.removeItem(STORAGE_KEY_GUEST_EVENTS);
            } catch {}
            return cuentaExistente;
          }
        }

        const safeSlug = trimmed
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const finalEmail = emailInput || `${safeSlug || 'comensal'}.${randomSuffix}@cabales.app`;

        const upgradedUser = await cabalesApi.actualizarUsuario(guestId, {
          nombre: trimmed,
          email: finalEmail
        });

        setCurrentUser(upgradedUser);
        try {
          localStorage.removeItem(STORAGE_KEY_GUEST_EVENTS);
        } catch {}
        return upgradedUser;
      }

      let targetUser: UsuarioDTO;

      if (emailInput) {
        const usuarios = await cabalesApi.obtenerUsuarios();
        const existente = usuarios.find((u) => u.email.toLowerCase() === emailInput);
        if (existente) {
          targetUser = existente;
        } else {
          targetUser = await cabalesApi.crearUsuario(trimmed, emailInput);
        }
      } else {
        const safeSlug = trimmed
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const email = `${safeSlug || 'comensal'}.${randomSuffix}@cabales.app`;

        targetUser = await cabalesApi.crearUsuario(trimmed, email);
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY_GUEST_EVENTS);
        if (stored) {
          const list: string[] = JSON.parse(stored);
          if (list.length > 0) {
            await cabalesApi.reclamarEventosInvitado(targetUser.id, { event_ids: list });
          }
          localStorage.removeItem(STORAGE_KEY_GUEST_EVENTS);
        }
      } catch {}

      setCurrentUser(targetUser);
      return targetUser;
    },
    [currentUser, isGuest, setCurrentUser]
  );

  // Iniciar sesión con identificador
  const loginWithEmailOrName = useCallback(
    async (identifier: string): Promise<UsuarioDTO> => {
      const query = identifier.trim();
      if (!query) throw new Error('Ingresa tu correo, nombre o código');
      const queryLower = query.toLowerCase();

      const usuarios = await cabalesApi.obtenerUsuarios();
      const match = usuarios.find((u) => {
        const uEmail = u.email.toLowerCase();
        const uNombre = u.nombre.trim().toLowerCase();
        const uId = u.id.toLowerCase();
        return (
          uEmail === queryLower ||
          uNombre === queryLower ||
          uId === queryLower ||
          uId.startsWith(queryLower)
        );
      });

      if (!match) {
        throw new Error(`No se encontró ninguna cuenta con "${query}"`);
      }

      if (currentUser && isGuest && currentUser.id !== match.id) {
        try {
          await cabalesApi.reclamarEventosInvitado(match.id, { guest_user_id: currentUser.id });
        } catch {}
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY_GUEST_EVENTS);
        if (stored) {
          const list: string[] = JSON.parse(stored);
          if (list.length > 0) {
            await cabalesApi.reclamarEventosInvitado(match.id, { event_ids: list });
          }
          localStorage.removeItem(STORAGE_KEY_GUEST_EVENTS);
        }
      } catch {}

      setCurrentUser(match);
      return match;
    },
    [currentUser, isGuest, setCurrentUser]
  );

  const updateCurrentUserName = useCallback(
    async (nuevoNombre: string): Promise<UsuarioDTO> => {
      const trimmed = nuevoNombre.trim();
      if (!currentUser?.id || !trimmed) {
        throw new Error('No hay usuario activo o el nombre es inválido');
      }

      const actualizado = await cabalesApi.actualizarUsuario(currentUser.id, { nombre: trimmed });
      setCurrentUser(actualizado);
      return actualizado;
    },
    [currentUser, setCurrentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentUserId: currentUser?.id || '',
        currentUserName: currentUser?.nombre || '',
        isLoggedIn: !!currentUser,
        isGuest,
        hasFullAccount,
        bankDetails,
        setBankDetails,
        setCurrentUser,
        loginWithGoogle,
        startGuestSession,
        devLogin,
        registerOrLogin,
        loginWithEmailOrName,
        updateCurrentUserName,
        trackGuestEvent,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
