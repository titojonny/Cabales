import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Users,
  Clock,
  LogOut,
  UserCheck,
  Zap,
  BarChart3,
  Layers,
  Lock,
  ArrowRight,
  ShieldCheck,
  Copy,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cabalesApi } from '../services/api.service';
import { EventoUsuarioItemDTO, UsuarioDTO } from '../types/cabales.types';
import { centavosADinero } from '../utils/currency';
import { copiarTextoAlPortapapeles } from '../utils/whatsapp';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { GoogleLoginButton } from '../components/common/GoogleLoginButton';
import { FinanzasView } from '../components/FinanzasView';
import { useUserInvitationsSocket, UserInvitationEvent } from '../services/socket.service';
import { InvitacionMesaDTO } from '../types/cabales.types';
import { Bell } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    currentUserId,
    isLoggedIn,
    isGuest,
    hasFullAccount,
    startGuestSession,
    registerOrLogin,
    loginWithEmailOrName,
    updateCurrentUserName,
    bankDetails,
    setBankDetails,
    trackGuestEvent,
    logout
  } = useAuth();

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Modo de vista principal: 'MESAS' vs 'FINANZAS'
  const [mainView, setMainView] = useState<'MESAS' | 'FINANZAS'>('MESAS');

  // Estados de datos
  const [events, setEvents] = useState<EventoUsuarioItemDTO[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<InvitacionMesaDTO[]>([]);
  const [isRespondingInvite, setIsRespondingInvite] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<'ACTIVOS' | 'CERRADOS'>('ACTIVOS');

  // Modal: Crear Salida
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newEventName, setNewEventName] = useState<string>('');
  const [isSubmittingEvent, setIsSubmittingEvent] = useState<boolean>(false);

  // Modal: Eliminar Salida
  const [eventToDelete, setEventToDelete] = useState<EventoUsuarioItemDTO | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState<boolean>(false);

  // Onboarding
  const [welcomeName, setWelcomeName] = useState<string>('');
  const [isStartingOnboarding, setIsStartingOnboarding] = useState<boolean>(false);
  const [joinTableInput, setJoinTableInput] = useState<string>('');
  const [showJoinTableInput, setShowJoinTableInput] = useState<boolean>(false);
  const [existingAccountInput, setExistingAccountInput] = useState<string>('');
  const [showExistingLogin, setShowExistingLogin] = useState<boolean>(false);
  const [isLoggingInExisting, setIsLoggingInExisting] = useState<boolean>(false);

  // Modal: Registro / Vincular Cuenta
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);

  // Modal: Perfil y Cuentas
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editProfileName, setEditProfileName] = useState<string>('');
  const [editProfileBankDetails, setEditProfileBankDetails] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Carga de eventos
  const loadEvents = useCallback(
    async (userId?: string) => {
      const id = userId || currentUserId;
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await cabalesApi.obtenerEventosUsuario(id);
        setEvents(data || []);
      } catch (err: any) {
        showToast('No se pudieron cargar tus salidas', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [currentUserId, showToast]
  );

  // Carga de invitaciones
  const loadInvitations = useCallback(async () => {
    if (!currentUserId || isGuest) return;
    try {
      const invs = await cabalesApi.obtenerMisInvitaciones();
      setPendingInvitations(invs || []);
    } catch {
      // ignore
    }
  }, [currentUserId, isGuest]);

  useEffect(() => {
    if (isLoggedIn && currentUserId) {
      loadEvents(currentUserId);
      loadInvitations();
    } else {
      setIsLoading(false);
      setPendingInvitations([]);
    }
  }, [isLoggedIn, currentUserId, loadEvents, loadInvitations]);

  // WebSocket en tiempo real para recibir notificaciones de invitaciones a sentarse
  useUserInvitationsSocket(
    currentUserId,
    useCallback(
      (event: UserInvitationEvent) => {
        showToast(
          `🔔 ¡${event.invitacion.anfitrion_nombre} te invitó a la mesa "${event.invitacion.nombre_mesa}"!`,
          'info'
        );
        loadInvitations();
      },
      [showToast, loadInvitations]
    )
  );

  const handleAcceptInvite = async (invitationId: string, eventId: string) => {
    setIsRespondingInvite(true);
    try {
      await cabalesApi.aceptarInvitacion(invitationId);
      showToast('¡Te has sentado a la mesa exitosamente!', 'success');
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      navigate(`/events/${eventId}`);
    } catch (err: any) {
      showToast(err.message || 'Error al aceptar invitación', 'error');
    } finally {
      setIsRespondingInvite(false);
    }
  };

  const handleRejectInvite = async (invitationId: string) => {
    setIsRespondingInvite(true);
    try {
      await cabalesApi.rechazarInvitacion(invitationId);
      showToast('Invitación descartada', 'info');
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (err: any) {
      showToast(err.message || 'Error al rechazar invitación', 'error');
    } finally {
      setIsRespondingInvite(false);
    }
  };

  // Filtros
  const activeEvents = useMemo(() => {
    return events.filter((e) => e.estado === 'ACTIVO' || !e.esta_saldado);
  }, [events]);

  const closedEvents = useMemo(() => {
    return events.filter((e) => e.estado === 'CERRADO' && e.esta_saldado);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return selectedFilter === 'ACTIVOS' ? activeEvents : closedEvents;
  }, [selectedFilter, activeEvents, closedEvents]);

  const totalActiveSpending = useMemo(() => {
    return activeEvents.reduce((sum, e) => sum + e.total_gastado_centavos, 0);
  }, [activeEvents]);

  // Iniciar como invitado rápido (100% sin registro)
  const handleStartAsGuest = async () => {
    setIsStartingOnboarding(true);
    try {
      const guest = await startGuestSession('Invitado');
      showToast('Entraste en modo rápido sin cuenta', 'info');
      await loadEvents(guest.id);
      setIsCreateModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar modo rápido', 'error');
    } finally {
      setIsStartingOnboarding(false);
    }
  };

  // Onboarding con nombre
  const handleStartWithPersonalName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = welcomeName.trim();
    if (!name) return;

    setIsStartingOnboarding(true);
    try {
      const user = await registerOrLogin(name);
      showToast(`¡Bienvenido a Cabales, ${user.nombre}!`, 'success');
      loadEvents(user.id);
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar sesión', 'error');
    } finally {
      setIsStartingOnboarding(false);
    }
  };

  // Unirse por código o link
  const handleJoinTable = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const input = joinTableInput.trim();
    if (!input) return;

    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = input.match(uuidRegex);
    const eventId = match ? match[0] : input;

    if (isGuest) {
      trackGuestEvent(eventId);
    }
    navigate(`/events/${eventId}`);
  };

  // Crear salida
  const handleCreateEvent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newEventName.trim();
    let creatorId = currentUserId;

    if (!name) return;

    setIsSubmittingEvent(true);
    try {
      if (!creatorId) {
        const guest = await startGuestSession('Invitado');
        creatorId = guest.id;
      }

      const created = await cabalesApi.crearEvento(name, creatorId);
      if (isGuest) {
        trackGuestEvent(created.id);
      }
      setIsCreateModalOpen(false);
      setNewEventName('');
      showToast(`¡Mesa "${created.nombre}" creada!`, 'success');
      navigate(`/events/${created.id}`);
    } catch (err: any) {
      showToast(err.message || 'Error al crear la salida', 'error');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Perfil
  const openUserModal = () => {
    if (currentUser) {
      setEditProfileName(currentUser.nombre);
    }
    setEditProfileBankDetails(bankDetails);
    setIsUserModalOpen(true);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = editProfileName.trim();
    if (!name) return;

    setIsSavingProfile(true);
    try {
      await updateCurrentUserName(name);
      setBankDetails(editProfileBankDetails);
      setIsUserModalOpen(false);
      showToast('Perfil y datos de cobro actualizados', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar perfil', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLoginExisting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = existingAccountInput.trim();
    if (!query) {
      showToast('Ingresa tu correo, nombre o código', 'warning');
      return;
    }

    setIsLoggingInExisting(true);
    try {
      const user = await loginWithEmailOrName(query);
      showToast(`¡Bienvenido de vuelta, ${user.nombre}!`, 'success');
      setExistingAccountInput('');
      await loadEvents(user.id);
    } catch (err: any) {
      showToast(err.message || 'No se encontró la cuenta', 'error');
    } finally {
      setIsLoggingInExisting(false);
    }
  };

  const handleLogout = () => {
    logout();
    setEvents([]);
    setIsUserModalOpen(false);
    showToast('Sesión cerrada en este dispositivo', 'info');
  };

  const handleConfirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeletingEvent(true);
    try {
      await cabalesApi.eliminarEvento(eventToDelete.id);
      showToast(`Mesa "${eventToDelete.nombre}" eliminada exitosamente`, 'success');
      setEventToDelete(null);
      await loadEvents();
    } catch (err: any) {
      showToast(err.message || 'No se pudo eliminar la mesa', 'error');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  return (
    <div className="mobile-app-wrapper">
      {/* Header Superior */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-title">
            <span className="brand-badge">
              <Zap size={11} /> CABALES
            </span>
            <span>Cabales</span>
          </div>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isGuest && (
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  style={{
                    background: 'rgba(77, 190, 85, 0.16)',
                    border: '1px solid var(--cabales-green-primary)',
                    color: 'var(--cabales-green-mint)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  Guardar Cuenta
                </button>
              )}
              <button
                type="button"
                className="user-pill"
                onClick={openUserModal}
                aria-label="Abrir perfil"
              >
                <div className="user-pill-avatar">
                  {currentUser.nombre.charAt(0).toUpperCase()}
                </div>
                <span>{currentUser.nombre}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Switch de Vistas: Mesas vs Mis Finanzas */}
      {currentUser && (
        <div style={{ padding: '8px 16px 0' }}>
          <div className="segment-container" style={{ marginBottom: '8px' }}>
            <button
              type="button"
              className={`segment-btn ${mainView === 'MESAS' ? 'active' : ''}`}
              onClick={() => setMainView('MESAS')}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} />
                <span>Mis Salidas</span>
              </div>
            </button>
            <button
              type="button"
              className={`segment-btn ${mainView === 'FINANZAS' ? 'active' : ''}`}
              onClick={() => setMainView('FINANZAS')}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={15} />
                <span>Mis Finanzas</span>
                {!hasFullAccount && <Lock size={12} color="var(--cabales-gray)" />}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main style={{ flex: 1, padding: '12px 16px 85px' }}>
        {!currentUser ? (
          /* PANTALLA DE ENTRADA CON OPCIÓN RÁPIDA DE INVITADO */
          <div style={{ maxWidth: '480px', margin: '14px auto 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div className="brand-badge" style={{ marginBottom: '12px', fontSize: '0.78rem', padding: '4px 12px' }}>
                <Sparkles size={14} />
                <span>Cuentas claras, amistades cabales 🇸🇻</span>
              </div>
              <h1 style={{ fontSize: '1.95rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em', margin: '0 0 10px' }}>
                Divide tus salidas sin que sobre ni falte un centavo
              </h1>
              <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.45 }}>
                Rápido, equitativo y con cobros automáticos por WhatsApp.
              </p>
            </div>

            {/* TARJETA ÚNICA DE ENTRADA: SIMPLE, RÁPIDA Y SIN SATURACIÓN */}
            <div
              className="glass-card"
              style={{
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                border: '1px solid rgba(77, 190, 85, 0.35)',
                background: 'linear-gradient(135deg, rgba(33, 38, 32, 0.95) 0%, rgba(20, 26, 20, 0.95) 100%)'
              }}
            >
              {/* Opción 1: Acceso Seguro con Google (Recomendado) */}
              <div>
                <GoogleLoginButton
                  onSuccess={() => {
                    showToast('¡Bienvenido a Cabales!', 'success');
                    loadEvents();
                  }}
                />
              </div>

              {/* Separador limpio */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', color: 'var(--cabales-slate)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                <div style={{ flex: 1, borderBottom: '1px solid rgba(113, 119, 109, 0.25)' }} />
                <span style={{ padding: '0 10px' }}>O SI ESTÁS EN EL RESTAURANTE</span>
                <div style={{ flex: 1, borderBottom: '1px solid rgba(113, 119, 109, 0.25)' }} />
              </div>

              {/* Opción 2: Modo Invitado Rápido */}
              <button
                type="button"
                className="btn-primary"
                onClick={handleStartAsGuest}
                disabled={isStartingOnboarding}
                style={{ height: '48px', fontSize: '0.95rem' }}
              >
                {isStartingOnboarding ? 'Iniciando...' : '⚡ Modo Invitado (Sin Registro) ➔'}
              </button>

              {/* Acciones secundarias colapsadas en enlaces limpios */}
              <div style={{ borderTop: '1px solid rgba(113, 119, 109, 0.2)', paddingTop: '14px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Unirse a mesa con código o link */}
                {!showJoinTableInput ? (
                  <button
                    type="button"
                    onClick={() => setShowJoinTableInput(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--cabales-gray)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    🔗 ¿Tienes un código o enlace de mesa?
                  </button>
                ) : (
                  <form onSubmit={handleJoinTable} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="cabales-input"
                      placeholder="Pega el código o enlace de mesa"
                      value={joinTableInput}
                      onChange={(e) => setJoinTableInput(e.target.value)}
                      style={{ flex: 1, height: '40px', fontSize: '0.85rem' }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn-secondary"
                      disabled={!joinTableInput.trim()}
                      style={{ padding: '0 14px', height: '40px', fontSize: '0.85rem', flexShrink: 0 }}
                    >
                      Ir ➔
                    </button>
                  </form>
                )}

                {/* Acceso con cuenta anterior por nombre o código */}
                {!showExistingLogin ? (
                  <button
                    type="button"
                    onClick={() => setShowExistingLogin(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--cabales-slate)',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    ¿Ya tenías cuenta con código o nombre? Iniciar sesión
                  </button>
                ) : (
                  <form onSubmit={handleLoginExisting} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="cabales-input"
                      placeholder="Tu correo, nombre o código"
                      value={existingAccountInput}
                      onChange={(e) => setExistingAccountInput(e.target.value)}
                      style={{ flex: 1, height: '40px', fontSize: '0.85rem' }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn-secondary"
                      disabled={isLoggingInExisting || !existingAccountInput.trim()}
                      style={{ padding: '0 14px', height: '40px', fontSize: '0.85rem', flexShrink: 0 }}
                    >
                      Entrar ➔
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : mainView === 'FINANZAS' ? (
          /* VISTA DE FINANZAS PERSONALES Y CONTROL DE DEUDAS */
          <FinanzasView
            onOpenRegisterModal={() => {
              setIsRegisterModalOpen(true);
            }}
          />
        ) : (
          /* VISTA DE MESAS Y SALIDAS */
          <div>
            {/* Banner de Invitado si está en modo anónimo */}
            {isGuest && (
              <div
                style={{
                  background: 'rgba(77, 190, 85, 0.12)',
                  border: '1px solid rgba(77, 190, 85, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--cabales-offwhite)', display: 'block' }}>
                    Estás en modo temporal
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--cabales-gray)' }}>
                    Crea tu cuenta para guardar tus cobros pendientes para siempre.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsRegisterModalOpen(true)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.78rem', height: 'auto', flexShrink: 0 }}
                >
                  Crear Cuenta
                </button>
              </div>
            )}

            {/* BANNER DE INVITACIONES PENDIENTES */}
            {pendingInvitations.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="glass-card"
                    style={{
                      padding: '16px',
                      marginBottom: '10px',
                      border: '1.5px solid rgba(77, 190, 85, 0.45)',
                      background:
                        'linear-gradient(135deg, rgba(77, 190, 85, 0.18) 0%, rgba(33, 38, 32, 0.95) 100%)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        marginBottom: '12px'
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'var(--cabales-green-primary)',
                          color: '#141F14',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Bell size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              color: 'var(--cabales-green-mint)',
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}
                          >
                            Invitación a sentarte
                          </span>
                        </div>
                        <h4
                          style={{
                            margin: '2px 0 2px',
                            fontSize: '1.02rem',
                            fontWeight: 800,
                            color: 'var(--cabales-offwhite)'
                          }}
                        >
                          Mesa "{inv.nombre_mesa}"
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--cabales-gray)' }}>
                          Te invitó <strong style={{ color: 'var(--cabales-offwhite)' }}>{inv.anfitrion.nombre}</strong> ({inv.numero_comensales} comensales)
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={isRespondingInvite}
                        onClick={() => handleAcceptInvite(inv.id, inv.evento_id)}
                        style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                      >
                        Unirme a la mesa ➔
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isRespondingInvite}
                        onClick={() => handleRejectInvite(inv.id)}
                        style={{ padding: '8px 12px', fontSize: '0.82rem', color: 'var(--cabales-gray)' }}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Global Spending Card */}
            <div
              className="glass-card"
              style={{
                padding: '20px',
                marginBottom: '18px',
                background: 'linear-gradient(135deg, rgba(33, 38, 32, 0.95) 0%, rgba(20, 25, 20, 0.9) 100%)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--cabales-gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Total en Salidas Activas
                </span>
                <span style={{ background: 'rgba(77, 190, 85, 0.2)', color: 'var(--cabales-green-mint)', fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', border: '1px solid rgba(77, 190, 85, 0.4)' }}>
                  {activeEvents.length} mesas abiertas
                </span>
              </div>
              <div className="money-amount" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--cabales-offwhite)', lineHeight: 1.1, marginBottom: '6px' }}>
                {centavosADinero(totalActiveSpending)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--cabales-gray)' }}>
                Gastos compartidos sin que sobre ni falte un centavo
              </div>
            </div>

            {/* Selector de Pestañas: Activos vs Histórico */}
            <div className="segment-container">
              <button
                type="button"
                className={`segment-btn ${selectedFilter === 'ACTIVOS' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('ACTIVOS')}
              >
                Mesas Activas ({activeEvents.length})
              </button>
              <button
                type="button"
                className={`segment-btn ${selectedFilter === 'CERRADOS' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('CERRADOS')}
              >
                Histórico ({closedEvents.length})
              </button>
            </div>

            {/* Listado de Mesas */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cabales-gray)' }}>
                <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: '12px' }}>
                  <Sparkles size={28} color="var(--cabales-green-primary)" />
                </div>
                <p>Cargando tus salidas...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cabales-gray)' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(77, 190, 85, 0.15)',
                    border: '1px solid rgba(77, 190, 85, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'var(--cabales-green-mint)'
                  }}
                >
                  <Sparkles size={28} />
                </div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--cabales-offwhite)', margin: '0 0 8px' }}>
                  {selectedFilter === 'ACTIVOS'
                    ? 'No tienes mesas activas ni cobros pendientes'
                    : 'No tienes mesas en el histórico'}
                </h3>
                <p style={{ fontSize: '0.88rem', margin: '0 0 20px', lineHeight: 1.4 }}>
                  {selectedFilter === 'ACTIVOS'
                    ? '¡Crea una nueva salida con tus amigos para empezar a dividir gastos!'
                    : 'Las mesas 100% saldadas aparecerán aquí una vez que todos estén cabales.'}
                </p>
                {selectedFilter === 'ACTIVOS' && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ maxWidth: '240px', margin: '0 auto' }}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    + Crear Primera Salida
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredEvents.map((evento) => (
                  <div
                    key={evento.id}
                    className="glass-card"
                    style={{ padding: '16px 18px', cursor: 'pointer' }}
                    onClick={() => {
                      trackGuestEvent(evento.id);
                      navigate(`/events/${evento.id}`);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--cabales-offwhite)', margin: '0 0 6px' }}>
                          {evento.nombre}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--cabales-gray)' }}>
                            <Clock size={12} />
                            {new Date(evento.fecha).toLocaleDateString('es-SV', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: evento.es_creador ? 'rgba(77, 190, 85, 0.16)' : 'rgba(0, 0, 0, 0.25)',
                              color: evento.es_creador ? 'var(--cabales-green-mint)' : 'var(--cabales-gray)',
                              border: evento.es_creador ? '1px solid rgba(77, 190, 85, 0.35)' : '1px solid rgba(113, 119, 109, 0.35)'
                            }}
                          >
                            {evento.es_creador ? 'Organizador' : 'Invitado'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {evento.estado === 'ACTIVO' ? (
                          <StatusBadge status={evento.estado} />
                        ) : (
                          <span className={`balance-pill ${evento.esta_saldado ? 'credit' : 'debt'}`}>
                            {evento.esta_saldado ? '✓ 100% Saldada' : '⏳ Deudas Pendientes'}
                          </span>
                        )}
                        {evento.es_creador && (
                          <button
                            type="button"
                            title="Eliminar mesa"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEventToDelete(evento);
                            }}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: 'var(--radius-sm)',
                              padding: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            aria-label={`Eliminar mesa ${evento.nombre}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(113, 119, 109, 0.25)', margin: '12px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: 'var(--cabales-gray)' }}>
                        <Users size={16} />
                        <span>{evento.numero_comensales} comensales</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--cabales-gray)' }}>Total:</span>
                        <span className="money-amount" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cabales-offwhite)' }}>
                          {centavosADinero(evento.total_gastado_centavos)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botón FAB para crear salida */}
            <button
              type="button"
              className="fab-btn"
              onClick={() => setIsCreateModalOpen(true)}
              aria-label="Crear nueva salida"
            >
              <Plus size={28} />
            </button>
          </div>
        )}
      </main>

      {/* MODAL: VINCULAR / REGISTRAR CUENTA COMPLETA */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Crear Cuenta en Cabales"
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(77, 190, 85, 0.16)',
              color: 'var(--cabales-green-mint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px'
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--cabales-offwhite)' }}>
            Guarda tus salidas para siempre
          </h4>
          <p style={{ color: 'var(--cabales-gray)', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
            Sincroniza tus mesas activas, revisa quién te debe dinero y lleva el registro de tus gastos.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <GoogleLoginButton
            text="Continuar con Google"
            onSuccess={() => {
              setIsRegisterModalOpen(false);
              showToast('¡Cuenta vinculada con Google exitosamente!', 'success');
              loadEvents();
            }}
          />

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsRegisterModalOpen(false)}
            style={{ width: '100%', marginTop: '6px', fontSize: '0.85rem' }}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* MODAL: CREAR SALIDA */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nueva Salida"
      >
        <p style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem', marginBottom: '18px', lineHeight: 1.4 }}>
          Crea una mesa para ti y tus amigos. Podrás agregar comensales y anotar consumos al instante.
        </p>

        <form onSubmit={handleCreateEvent}>
          <div className="cabales-input-group">
            <label className="cabales-label">Nombre de la salida</label>
            <input
              type="text"
              className="cabales-input"
              placeholder="Ej. Alitas con los de la U, Cena Cumple"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmittingEvent || !newEventName.trim()}
            style={{ marginTop: '16px' }}
          >
            {isSubmittingEvent ? 'Creando mesa...' : 'Crear Salida y Sentar Mesa'}
          </button>
        </form>
      </Modal>

      {/* MODAL: PERFIL Y CUENTAS */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Mi Perfil"
      >
        {currentUser && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '20px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--cabales-green-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: '#141F14'
                }}
              >
                {currentUser.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--cabales-offwhite)' }}>
                  {currentUser.nombre}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--cabales-gray)' }}>
                  {isGuest ? '⚡ Cuenta temporal de invitado' : currentUser.email}
                </p>
              </div>
            </div>

            {isGuest && (
              <div style={{ marginBottom: '18px' }}>
                <GoogleLoginButton
                  text="Vincular cuenta con Google"
                  onSuccess={() => {
                    setIsUserModalOpen(false);
                    showToast('¡Cuenta vinculada con Google exitosamente!', 'success');
                    loadEvents();
                  }}
                />
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--cabales-offwhite)' }}>
                Editar Datos Personales:
              </span>

              <div className="cabales-input-group">
                <label className="cabales-label">Nombre o Apodo</label>
                <input
                  type="text"
                  className="cabales-input"
                  placeholder="Ej. Jonathan"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                />
              </div>

              <div className="cabales-input-group">
                <label className="cabales-label">Datos Bancarios por defecto (para WhatsApp)</label>
                <input
                  type="text"
                  className="cabales-input"
                  placeholder="Ej. BAC 12345678, Agrícola o Chivo @usuario"
                  value={editProfileBankDetails}
                  onChange={(e) => setEditProfileBankDetails(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSavingProfile || !editProfileName.trim()}
              >
                {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>

            {/* Código de Amigo para compartir */}
            <div
              style={{
                background: 'rgba(77, 190, 85, 0.12)',
                border: '1px solid rgba(77, 190, 85, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--cabales-gray)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                  Tu Código de Amigo
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--cabales-green-mint)', letterSpacing: '0.05em', fontFamily: 'monospace', marginTop: '2px' }}>
                  {currentUser.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  copiarTextoAlPortapapeles(currentUser.id.slice(0, 8).toUpperCase());
                  showToast('¡Código copiado al portapapeles!', 'success');
                }}
              >
                <Copy size={13} />
                <span>Copiar</span>
              </button>
            </div>


            <div style={{ textAlign: 'center', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--debt-text)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px'
                }}
              >
                <LogOut size={14} />
                <span>Cerrar sesión en este dispositivo</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: CONFIRMAR ELIMINAR MESA */}
      <Modal
        isOpen={!!eventToDelete}
        onClose={() => {
          if (!isDeletingEvent) setEventToDelete(null);
        }}
        title="¿Eliminar mesa?"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              color: '#fca5a5',
              fontSize: '0.88rem',
              lineHeight: 1.5
            }}
          >
            ¿Estás seguro de que deseas eliminar la mesa{' '}
            <strong style={{ color: '#fff' }}>"{eventToDelete?.nombre}"</strong>?
            <br />
            Esta acción borrará la mesa, los consumos y participantes registrados de forma permanente.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEventToDelete(null)}
              disabled={isDeletingEvent}
            >
              Cancelar
            </button>
            <button
              type="button"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                cursor: isDeletingEvent ? 'not-allowed' : 'pointer',
                padding: '10px 14px',
                fontSize: '0.88rem'
              }}
              onClick={handleConfirmDeleteEvent}
              disabled={isDeletingEvent}
            >
              {isDeletingEvent ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
