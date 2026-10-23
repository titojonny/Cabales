import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  QrCode,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  UserPlus,
  Receipt,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Share2,
  Copy,
  Lock,
  HeartHandshake
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cabalesApi } from '../services/api.service';
import { useTableSocket, TableUpdateEvent } from '../services/socket.service';
import {
  EventoDetalleDTO,
  ConsumoDTO,
  UsuarioDTO,
  ParticipanteDetalleDTO,
  InvitacionMesaDTO
} from '../types/cabales.types';
import { centavosADinero } from '../utils/currency';
import {
  generarMensajeInvitacionMesa,
  compartirTexto,
  copiarTextoAlPortapapeles
} from '../utils/whatsapp';
import { StatusBadge } from '../components/common/StatusBadge';
import { MoneyInput } from '../components/common/MoneyInput';
import { Modal } from '../components/common/Modal';
import { GoogleLoginButton } from '../components/common/GoogleLoginButton';

export const EventDetailPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, currentUserId, isLoggedIn, isGuest, registerOrLogin, trackGuestEvent } = useAuth();
  const { showToast } = useToast();

  const [evento, setEvento] = useState<EventoDetalleDTO | null>(null);
  const [consumos, setConsumos] = useState<ConsumoDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'COMENSALES' | 'CUENTA'>('COMENSALES');
  const [tableInvitation, setTableInvitation] = useState<InvitacionMesaDTO | null>(null);

  const isOrganizer = useMemo(() => {
    if (!evento || !currentUser) return false;
    return (
      evento.creador.id === currentUserId ||
      (!!currentUser.email && (evento.creador as any).email === currentUser.email)
    );
  }, [evento, currentUserId, currentUser]);

  const myParticipant = useMemo(() => {
    if (!evento || !currentUser) return undefined;
    return evento.participantes.find((p) => p.usuario_id === currentUserId);
  }, [evento, currentUserId, currentUser]);

  // Modal: Invitar QR
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Modal: Reclamar / Sentarse en la mesa
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [claimNameInput, setClaimNameInput] = useState<string>('');
  const [selectedGhostId, setSelectedGhostId] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // Modal: Agregar Comensal
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState<boolean>(false);
  const [addParticipantMode, setAddParticipantMode] = useState<'GUEST' | 'FRIEND'>('GUEST');
  const [newParticipantName, setNewParticipantName] = useState<string>('');
  const [friendCodeInput, setFriendCodeInput] = useState<string>('');
  const [isAddingParticipant, setIsAddingParticipant] = useState<boolean>(false);

  // Modal: Agregar / Editar Consumo
  const [isConsumoModalOpen, setIsConsumoModalOpen] = useState<boolean>(false);
  const [editingConsumoId, setEditingConsumoId] = useState<string | null>(null);
  const [consumoDesc, setConsumoDesc] = useState<string>('');
  const [consumoCentavos, setConsumoCentavos] = useState<number>(0);
  const [selectedParticipantsForConsumo, setSelectedParticipantsForConsumo] = useState<string[]>([]);
  const [isSavingConsumo, setIsSavingConsumo] = useState<boolean>(false);

  // Modal: Propina
  const [isTipModalOpen, setIsTipModalOpen] = useState<boolean>(false);
  const [tipPercentage, setTipPercentage] = useState<number>(10);
  const [isSavingTip, setIsSavingTip] = useState<boolean>(false);

  // Modal: Registrar Abono
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [payingParticipantId, setPayingParticipantId] = useState<string>('');
  const [paymentCentavos, setPaymentCentavos] = useState<number>(0);
  const [isSavingPayment, setIsSavingPayment] = useState<boolean>(false);

  // Modal: Cerrar Mesa
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [selectedPayerId, setSelectedPayerId] = useState<string>('');
  const [isClosingTable, setIsClosingTable] = useState<boolean>(false);

  // Modal: Eliminar Mesa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingTable, setIsDeletingTable] = useState<boolean>(false);

  // Carga del evento y consumos
  const loadEventData = useCallback(async (silent = false) => {
    if (!eventId) return;
    if (!silent) setIsLoading(true);
    try {
      const [evData, consData] = await Promise.all([
        cabalesApi.obtenerDetalleEvento(eventId),
        cabalesApi.obtenerConsumos(eventId)
      ]);
      setEvento(evData);
      setConsumos(consData || []);

      if (currentUserId) {
        try {
          const misInvites = await cabalesApi.obtenerMisInvitaciones();
          const match = misInvites.find((i) => i.evento_id === eventId);
          setTableInvitation(match || null);
        } catch {
          setTableInvitation(null);
        }
      }
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Error al cargar detalle de la mesa', 'error');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [eventId, currentUserId, showToast]);

  // Sincronización en vivo vía WebSockets
  const { isConnected } = useTableSocket(
    eventId,
    useCallback((updateEvent: TableUpdateEvent) => {
      loadEventData(true);
      if (updateEvent.action === 'CONSUMO_CREADO') {
        showToast('⚡ Nuevo consumo agregado a la mesa', 'info');
      } else if (updateEvent.action === 'CONSUMO_MODIFICADO') {
        showToast('⚡ Consumo modificado en la mesa', 'info');
      } else if (updateEvent.action === 'CONSUMO_ELIMINADO') {
        showToast('⚡ Consumo eliminado de la mesa', 'info');
      } else if (updateEvent.action === 'ABONO_REGISTRADO') {
        showToast('⚡ Se registró un abono a la cuenta', 'info');
      } else if (updateEvent.action === 'PROPINA_AGREGADA') {
        showToast('⚡ Propina agregada a la mesa', 'info');
      } else if (updateEvent.action === 'COMENSAL_AGREGADO') {
        showToast('⚡ Comensal sentado a la mesa', 'info');
      } else if (updateEvent.action === 'COMENSAL_ELIMINADO') {
        showToast('⚡ Comensal retirado de la mesa', 'info');
      } else if (updateEvent.action === 'MESA_CERRADA') {
        showToast('⚡ ¡La mesa fue liquidada!', 'success');
        navigate(`/events/${eventId}/settlement`);
      }
    }, [eventId, loadEventData, navigate, showToast]),
    currentUser?.nombre
  );

  useEffect(() => {
    if (eventId && isGuest) {
      trackGuestEvent(eventId);
    }
    loadEventData();
  }, [eventId, isGuest, loadEventData, trackGuestEvent]);

  // Cálculos de conciliación financiera
  const totalPagadoCentavos = useMemo(() => {
    if (!evento) return 0;
    return evento.participantes.reduce((sum, p) => sum + p.monto_pagado_centavos, 0);
  }, [evento]);

  const saldoPendienteCentavos = useMemo(() => {
    if (!evento) return 0;
    const diff = evento.total_gastado_centavos - totalPagadoCentavos;
    return diff > 0 ? diff : 0;
  }, [evento, totalPagadoCentavos]);

  const isFacturaCubierta = useMemo(() => {
    if (!evento || evento.total_gastado_centavos === 0) return false;
    return totalPagadoCentavos >= evento.total_gastado_centavos;
  }, [evento, totalPagadoCentavos]);

  const porcentajeCubierto = useMemo(() => {
    if (!evento || evento.total_gastado_centavos === 0) return 0;
    const pct = Math.min(100, Math.round((totalPagadoCentavos / evento.total_gastado_centavos) * 100));
    return isNaN(pct) ? 0 : pct;
  }, [evento, totalPagadoCentavos]);

  const isCurrentUserSeated = useMemo(() => {
    if (!evento || !currentUser) return false;
    return !!myParticipant;
  }, [evento, currentUser, myParticipant]);

  // URL compartible (usa IP local de red si se visualiza desde localhost de la PC para escanear en móvil)
  const getShareableEventUrl = () => {
    if (!eventId) return '';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseOrigin = isLocalhost ? `http://192.168.1.148:${window.location.port || '5173'}` : window.location.origin;
    return `${baseOrigin}/events/${eventId}`;
  };

  // Invitar QR
  const openInviteModal = async () => {
    if (!eventId) return;
    const url = getShareableEventUrl();
    try {
      const qrFn = (QRCode as any).toDataURL || (QRCode as any).default?.toDataURL;
      if (typeof qrFn === 'function') {
        const dataUrl = await qrFn(url, {
          margin: 2,
          width: 280,
          color: {
            dark: '#141F14',
            light: '#F1F1F1'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } else {
        setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(url)}`);
      }
      setIsInviteModalOpen(true);
    } catch {
      setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(url)}`);
      setIsInviteModalOpen(true);
    }
  };

  const handleShareInviteWhatsApp = () => {
    if (!evento || !eventId) return;
    const url = getShareableEventUrl();
    const texto = generarMensajeInvitacionMesa(evento, url);
    compartirTexto(`Unirse a ${evento.nombre}`, texto);
  };

  const handleCopyInviteLink = async () => {
    if (!eventId) return;
    const url = getShareableEventUrl();
    const ok = await copiarTextoAlPortapapeles(url);
    if (ok) {
      showToast('Enlace de la mesa copiado al portapapeles', 'success');
    } else {
      showToast('No se pudo copiar el enlace', 'error');
    }
  };

  const handleAcceptTableInvite = async () => {
    if (!tableInvitation) return;
    try {
      await cabalesApi.aceptarInvitacion(tableInvitation.id);
      showToast('¡Te has sentado a la mesa exitosamente!', 'success');
      setTableInvitation(null);
      await loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al aceptar invitación', 'error');
    }
  };

  const handleRejectTableInvite = async () => {
    if (!tableInvitation) return;
    try {
      await cabalesApi.rechazarInvitacion(tableInvitation.id);
      showToast('Invitación rechazada', 'info');
      setTableInvitation(null);
    } catch (err: any) {
      showToast(err.message || 'Error al rechazar invitación', 'error');
    }
  };

  // Unirse a la mesa directamente (vía QR o link)
  const handleJoinTable = async () => {
    if (!eventId) return;
    if (!currentUserId) {
      setIsClaimModalOpen(true);
      return;
    }
    setIsClaiming(true);
    try {
      await cabalesApi.agregarParticipante(eventId, { usuario_id: currentUserId });
      showToast('¡Te has sentado a la mesa exitosamente!', 'success');
      await loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al unirse a la mesa', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  // Reclamar asiento
  const handleClaimSeat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!eventId) return;

    setIsClaiming(true);
    try {
      let userId = currentUserId;

      // Si no tiene usuario, crearlo al vuelo
      if (!userId) {
        const name = claimNameInput.trim();
        if (!name) {
          showToast('Por favor escribe tu nombre', 'warning');
          setIsClaiming(false);
          return;
        }
        const createdUser = await registerOrLogin(name);
        userId = createdUser.id;
      }

      if (selectedGhostId) {
        // Reclamar fantasma
        await cabalesApi.reclamarParticipante(eventId, selectedGhostId, userId);
        showToast('¡Asiento reclamado con éxito!', 'success');
      } else {
        // Agregar nuevo participante a la mesa
        await cabalesApi.agregarParticipante(eventId, { usuario_id: userId });
        showToast('¡Te has sentado a la mesa!', 'success');
      }

      setIsClaimModalOpen(false);
      loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al sentarse en la mesa', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  // Agregar comensal
  const openAddParticipantModal = () => {
    setNewParticipantName('');
    setFriendCodeInput('');
    setAddParticipantMode('GUEST');
    setIsAddParticipantModalOpen(true);
  };

  const handleAddParticipant = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!eventId) return;

    setIsAddingParticipant(true);
    try {
      if (addParticipantMode === 'FRIEND') {
        const code = friendCodeInput.trim().toUpperCase();
        if (!code) {
          showToast('Ingresa el código de amigo de 8 caracteres', 'warning');
          setIsAddingParticipant(false);
          return;
        }
        if (currentUserId && (currentUserId.toUpperCase().startsWith(code) || code.startsWith(currentUserId.toUpperCase().slice(0, 8)))) {
          showToast('Ese es tu propio código de amigo. Para invitar a un amigo, pídele su código o agrégalo como comensal invitado.', 'warning');
          setIsAddingParticipant(false);
          return;
        }
        const res: any = await cabalesApi.agregarParticipante(eventId, { codigo_amigo: code });
        showToast(res.message || '¡Invitación enviada al amigo!', 'success');
      } else {
        const name = newParticipantName.trim();
        if (!name) {
          showToast('Ingresa el nombre del comensal invitado', 'warning');
          setIsAddingParticipant(false);
          return;
        }
        await cabalesApi.agregarParticipante(eventId, { nombre_invitado: name });
        showToast('Invitado agregado a la mesa', 'success');
      }

      setIsAddParticipantModalOpen(false);
      setFriendCodeInput('');
      setNewParticipantName('');
      loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al agregar comensal', 'error');
    } finally {
      setIsAddingParticipant(false);
    }
  };

  // Consumos
  const openCreateConsumoModal = () => {
    setEditingConsumoId(null);
    setConsumoDesc('');
    setConsumoCentavos(0);
    // Por defecto seleccionar todos los participantes sentados
    setSelectedParticipantsForConsumo(evento?.participantes.map((p) => p.id) || []);
    setIsConsumoModalOpen(true);
  };

  const openEditConsumoModal = (c: ConsumoDTO) => {
    setEditingConsumoId(c.id);
    setConsumoDesc(c.descripcion || '');
    setConsumoCentavos(c.monto_centavos);
    setSelectedParticipantsForConsumo(c.participantes.map((p) => p.participante_id));
    setIsConsumoModalOpen(true);
  };

  const handleSaveConsumo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!eventId) return;

    if (consumoCentavos <= 0) {
      showToast('Ingresa un monto válido mayor a $0.00', 'warning');
      return;
    }

    if (selectedParticipantsForConsumo.length === 0) {
      showToast('Selecciona al menos un comensal para dividir el consumo', 'warning');
      return;
    }

    setIsSavingConsumo(true);
    try {
      if (editingConsumoId) {
        await cabalesApi.actualizarConsumo(eventId, editingConsumoId, {
          descripcion: consumoDesc.trim() || undefined,
          monto_centavos: consumoCentavos,
          participante_ids: selectedParticipantsForConsumo
        });
        showToast('Consumo actualizado', 'success');
      } else {
        await cabalesApi.registrarConsumo(eventId, {
          descripcion: consumoDesc.trim() || undefined,
          monto_centavos: consumoCentavos,
          participante_ids: selectedParticipantsForConsumo
        });
        showToast('Consumo registrado en la cuenta', 'success');
      }

      setIsConsumoModalOpen(false);
      loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar consumo', 'error');
    } finally {
      setIsSavingConsumo(false);
    }
  };

  const handleDeleteConsumo = async (consumoId: string) => {
    if (!eventId) return;
    if (!window.confirm('¿Eliminar este consumo de la cuenta?')) return;

    try {
      await cabalesApi.eliminarConsumo(eventId, consumoId);
      showToast('Consumo eliminado', 'info');
      loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar consumo', 'error');
    }
  };

  // Propina
  const handleSaveTip = async () => {
    if (!eventId) return;
    setIsSavingTip(true);
    try {
      await cabalesApi.agregarPropina(eventId, {
        porcentaje: tipPercentage,
        participante_ids: evento?.participantes.map((p) => p.id)
      });
      showToast(`Propina del ${tipPercentage}% agregada equitativamente`, 'success');
      setIsTipModalOpen(false);
      loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al agregar propina', 'error');
    } finally {
      setIsSavingTip(false);
    }
  };

  // Eliminar comensal (Solo Organizador)
  const handleDeleteParticipant = async (participantId: string) => {
    if (!eventId) return;
    if (!window.confirm('¿Deseas eliminar a este comensal de la mesa?')) return;
    try {
      await cabalesApi.eliminarParticipante(eventId, participantId);
      showToast('Comensal eliminado de la mesa', 'info');
      loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar comensal', 'error');
    }
  };

  // Abonos
  const openPaymentModal = (participantId?: string) => {
    const defaultId = isOrganizer
      ? (participantId || myParticipant?.id || evento?.participantes[0]?.id || '')
      : (myParticipant?.id || '');
    setPayingParticipantId(defaultId);
    setPaymentCentavos(0);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!eventId || !payingParticipantId) return;
    if (paymentCentavos <= 0) {
      showToast('Ingresa un monto de abono mayor a $0.00', 'warning');
      return;
    }

    setIsSavingPayment(true);
    try {
      await cabalesApi.registrarPago(eventId, {
        participante_id: payingParticipantId,
        monto_centavos: paymentCentavos
      });
      showToast('Abono registrado al restaurante', 'success');
      setIsPaymentModalOpen(false);
      loadEventData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar abono', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Cierre de Mesa (Greedy Settlement)
  const handleStartCloseTable = () => {
    if ((evento?.participantes.length || 0) < 2) {
      showToast('Se necesitan al menos 2 personas en la mesa para conciliar deudas. Si estás solo, puedes eliminar la mesa con el botón Borrar.', 'warning');
      return;
    }
    if (saldoPendienteCentavos > 0) {
      // Falta dinero ante el restaurante: se debe designar un pagador
      setSelectedPayerId(evento?.participantes[0]?.id || '');
      setIsCloseModalOpen(true);
    } else {
      if (window.confirm('¿Cerrar y liquidar la mesa ahora? Se optimizarán todas las transferencias mínimas.')) {
        executeCloseTable();
      }
    }
  };

  const executeCloseTable = async () => {
    if (!eventId) return;
    setIsClosingTable(true);
    try {
      await cabalesApi.cerrarEvento(eventId, {
        pagador_restante_id: saldoPendienteCentavos > 0 ? selectedPayerId : undefined
      });
      showToast('¡Mesa cerrada y conciliada con éxito!', 'success');
      setIsCloseModalOpen(false);
      navigate(`/events/${eventId}/settlement`);
    } catch (err: any) {
      showToast(err.message || 'Error al cerrar la mesa', 'error');
    } finally {
      setIsClosingTable(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!eventId) return;
    setIsDeletingTable(true);
    try {
      await cabalesApi.eliminarEvento(eventId);
      showToast('Mesa eliminada exitosamente', 'success');
      navigate('/events');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la mesa', 'error');
    } finally {
      setIsDeletingTable(false);
    }
  };

  if (isLoading || !evento) {
    return (
      <div className="mobile-app-wrapper" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--cabales-gray)' }}>
          <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: '12px' }}>
            <Sparkles size={32} color="var(--cabales-green-primary)" />
          </div>
          <p>Cargando radiografía de la mesa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-app-wrapper">
      {/* Top Nav Bar */}
      <header className="app-header">
        <div className="custom-nav-bar">
          <button
            type="button"
            className="nav-back-btn"
            onClick={() => navigate('/events')}
            aria-label="Volver a mis salidas"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="nav-center-title" title={evento.nombre}>
            {evento.nombre}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isConnected && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--cabales-green-mint)',
                  background: 'rgba(77, 190, 85, 0.15)',
                  border: '1px solid rgba(77, 190, 85, 0.35)',
                  padding: '2px 7px',
                  borderRadius: '10px'
                }}
                title="Sincronización en vivo activa vía WebSockets"
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4dbe55',
                    boxShadow: '0 0 6px #4dbe55'
                  }}
                />
                En vivo
              </span>
            )}
            <StatusBadge status={evento.estado} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '16px 16px 90px' }}>
        {/* HERO CARD DE CONCILIACIÓN FINANCIERA */}
        <div
          className="glass-card"
          style={{
            padding: '20px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, rgba(33, 38, 32, 0.95) 0%, rgba(20, 26, 20, 0.95) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--cabales-gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Radiografía de Mesa
              </span>
              <div style={{ fontSize: '0.85rem', color: 'var(--cabales-offwhite)', marginTop: '2px' }}>
                Por {evento.creador.nombre} • {new Date(evento.fecha).toLocaleDateString('es-SV', { day: 'numeric', month: 'short' })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {isOrganizer && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#f87171',
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Eliminar mesa"
                >
                  <Trash2 size={13} />
                  <span>Borrar</span>
                </button>
              )}
              <button
                type="button"
                onClick={openInviteModal}
                style={{
                  background: 'rgba(77, 190, 85, 0.16)',
                  border: '1px solid rgba(77, 190, 85, 0.35)',
                  color: 'var(--cabales-green-mint)',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <QrCode size={14} />
                <span>Invitar QR</span>
              </button>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--cabales-offwhite)',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Users size={14} />
                <span>{evento.numero_comensales}</span>
              </div>
            </div>
          </div>

          {/* Tablero de 3 Cifras Financieras */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.28)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 10px',
              textAlign: 'center',
              marginBottom: '16px'
            }}
          >
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--cabales-gray)', fontWeight: 700, textTransform: 'uppercase' }}>
                Consumo Total
              </span>
              <div className="money-amount" style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '4px' }}>
                {centavosADinero(evento.total_gastado_centavos)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--cabales-gray)', fontWeight: 700, textTransform: 'uppercase' }}>
                Abonado Local
              </span>
              <div className="money-amount" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cabales-green-mint)', marginTop: '4px' }}>
                {centavosADinero(totalPagadoCentavos)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--cabales-gray)', fontWeight: 700, textTransform: 'uppercase' }}>
                Estado Factura
              </span>
              <div style={{ marginTop: '5px', fontSize: '0.76rem', fontWeight: 700 }}>
                {isFacturaCubierta ? (
                  <span style={{ color: 'var(--cabales-green-mint)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={13} /> 100% Cubierta
                  </span>
                ) : saldoPendienteCentavos > 0 ? (
                  <span style={{ color: 'var(--debt-text)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <AlertTriangle size={13} /> Faltan {centavosADinero(saldoPendienteCentavos)}
                  </span>
                ) : (
                  <span style={{ color: 'var(--cabales-gray)' }}>Sin consumos</span>
                )}
              </div>
            </div>
          </div>

          {/* Barra Visual de Conciliación */}
          <div>
            <div style={{ height: '8px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid rgba(113, 119, 109, 0.3)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${porcentajeCubierto}%`,
                  background: isFacturaCubierta ? 'var(--cabales-green-mint)' : 'var(--cabales-green-primary)',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--cabales-gray)', marginTop: '6px' }}>
              <span>{porcentajeCubierto}% cubierto ante restaurante</span>
              <span>{isFacturaCubierta ? '✓ Cuenta equilibrada' : 'Abono pendiente'}</span>
            </div>
          </div>

          {/* Si está cerrada -> CTA hacia liquidación */}
          {evento.estado === 'CERRADO' && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(113, 119, 109, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--cabales-green-mint)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>{evento.esta_totalmente_saldado ? '✓ Mesa 100% Saldada' : 'Mesa en Liquidación'}</span>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.84rem', width: 'auto' }}
                onClick={() => navigate(`/events/${evento.id}/settlement`)}
              >
                <span>Ver Deudas</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* BANNER DE INVITACIÓN O MESA PRIVADA PARA USUARIOS NO SENTADOS */}
        {evento.estado === 'ACTIVO' && !isCurrentUserSeated && (
          tableInvitation ? (
            <div
              className="glass-card"
              style={{
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid rgba(77, 190, 85, 0.5)',
                background: 'linear-gradient(135deg, rgba(77, 190, 85, 0.2) 0%, rgba(20, 26, 20, 0.95) 100%)'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--cabales-green-primary)',
                    color: '#141F14',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--cabales-offwhite)' }}>
                    🔔 ¡Te han invitado a esta mesa!
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: 'var(--cabales-gray)', margin: 0, lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--cabales-offwhite)' }}>{tableInvitation.anfitrion?.nombre || 'El anfitrión'}</strong> te invitó a unirte a esta cuenta.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAcceptTableInvite}
                  style={{ flex: 2 }}
                >
                  Unirme a la mesa ➔
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRejectTableInvite}
                  style={{ flex: 1 }}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ) : (
            <div
              className="glass-card"
              style={{
                padding: '18px',
                marginBottom: '16px',
                border: '1.5px solid var(--cabales-green-primary)',
                background: 'linear-gradient(135deg, rgba(77, 190, 85, 0.15) 0%, rgba(20, 26, 20, 0.95) 100%)',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={20} color="var(--cabales-green-primary)" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--cabales-offwhite)' }}>
                  ¿Estás en la mesa? ¡Únete ahora!
                </h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--cabales-gray)', margin: '0 0 14px', lineHeight: 1.4 }}>
                Únete a la mesa para que tu nombre aparezca entre los comensales, puedas ordenar tus platos y saldar tu cuenta exacta.
              </p>
              {isLoggedIn ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleJoinTable}
                  disabled={isClaiming}
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                >
                  ⚡ Sentarme a la mesa como {currentUser?.nombre || 'Comensal'}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setIsClaimModalOpen(true)}
                    style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                  >
                    ⚡ Escribir mi nombre y sentarme a la mesa
                  </button>
                  <div style={{ margin: '4px 0' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cabales-gray)' }}>o ingresa con tu cuenta</span>
                  </div>
                  <GoogleLoginButton
                    onSuccess={() => {
                      showToast('¡Sesión iniciada!', 'success');
                      loadEventData();
                    }}
                  />
                </div>
              )}
            </div>
          )
        )}

        {/* NAVEGACIÓN: TABS COMENSALES VS CUENTA */}
        <div className="segment-container">
          <button
            type="button"
            className={`segment-btn ${activeTab === 'COMENSALES' ? 'active' : ''}`}
            onClick={() => setActiveTab('COMENSALES')}
          >
            👥 Comensales ({evento.participantes.length})
          </button>
          <button
            type="button"
            className={`segment-btn ${activeTab === 'CUENTA' ? 'active' : ''}`}
            onClick={() => setActiveTab('CUENTA')}
          >
            🧾 Cuenta Detallada ({consumos.length})
          </button>
        </div>

        {/* TAB COMENSALES */}
        {activeTab === 'COMENSALES' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Comensales & Balances</h2>
                  <p style={{ fontSize: '0.78rem', color: 'var(--cabales-gray)', margin: '2px 0 0' }}>
                    Monitorea quién debe y quién tiene saldo a favor en vivo
                  </p>
                </div>
              </div>

              {evento.estado === 'ACTIVO' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ flex: 1, minWidth: '100px', padding: '8px 12px', fontSize: '0.82rem', height: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    onClick={openCreateConsumoModal}
                  >
                    <Plus size={15} />
                    <span>+ Consumo</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      minWidth: '100px',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      background: 'rgba(77, 190, 85, 0.15)',
                      borderColor: 'rgba(77, 190, 85, 0.4)',
                      color: 'var(--cabales-green-mint)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}
                    onClick={() => openPaymentModal()}
                  >
                    <DollarSign size={15} />
                    <span>+ Abonar</span>
                  </button>

                  {isOrganizer && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1, minWidth: '100px', padding: '8px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      onClick={openAddParticipantModal}
                    >
                      <UserPlus size={15} />
                      <span>+ Comensal</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {evento.participantes.map((p) => {
                const isDeudor =
                  evento.estado === 'CERRADO'
                    ? !p.esta_saldado && (p.deuda_pendiente_centavos ?? 0) > 0
                    : p.monto_consumido_centavos > p.monto_pagado_centavos;

                const isCreditor =
                  evento.estado === 'CERRADO'
                    ? !p.esta_saldado && (p.por_cobrar_pendiente_centavos ?? 0) > 0
                    : p.monto_pagado_centavos > p.monto_consumido_centavos;

                return (
                  <div key={p.id} className="glass-card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      {/* Avatar e Identidad */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isDeudor
                              ? 'rgba(239, 68, 68, 0.2)'
                              : isCreditor
                              ? 'rgba(121, 237, 145, 0.2)'
                              : 'rgba(113, 119, 109, 0.3)',
                            border: isDeudor
                              ? '1px solid rgba(239, 68, 68, 0.4)'
                              : isCreditor
                              ? '1px solid rgba(121, 237, 145, 0.4)'
                              : '1px solid rgba(113, 119, 109, 0.35)',
                            color: isDeudor
                              ? 'var(--debt-text)'
                              : isCreditor
                              ? 'var(--credit-text)'
                              : 'var(--cabales-offwhite)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                          }}
                        >
                          {p.es_fantasma ? '👻' : p.nombre_visible.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--cabales-offwhite)' }}>
                              {p.usuario_id === currentUserId ? `Tú (${p.nombre_visible})` : p.nombre_visible}
                            </span>
                            {p.usuario_id === evento.creador.id && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(77, 190, 85, 0.16)', color: 'var(--cabales-green-mint)', padding: '1px 5px', borderRadius: '4px' }}>
                                Org
                              </span>
                            )}
                            {p.es_fantasma && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(0, 0, 0, 0.25)', color: 'var(--cabales-gray)', padding: '1px 5px', borderRadius: '4px' }}>
                                Invitado
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--cabales-gray)', marginTop: '2px' }}>
                            Consumo: <strong style={{ color: 'var(--cabales-offwhite)' }}>{centavosADinero(p.monto_consumido_centavos)}</strong> • Abonó: <strong style={{ color: 'var(--cabales-offwhite)' }}>{centavosADinero(p.monto_pagado_centavos)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Pill de Balance */}
                      <div>
                        {evento.estado === 'CERRADO' ? (
                          p.esta_saldado ? (
                            <span className="balance-pill credit">Saldado</span>
                          ) : (p.deuda_pendiente_centavos ?? 0) > 0 ? (
                            <span className="balance-pill debt">
                              Debe {centavosADinero(p.deuda_pendiente_centavos)}
                            </span>
                          ) : (p.por_cobrar_pendiente_centavos ?? 0) > 0 ? (
                            <span className="balance-pill credit">
                              +{centavosADinero(p.por_cobrar_pendiente_centavos)} a favor
                            </span>
                          ) : (
                            <span className="balance-pill credit">Cabal</span>
                          )
                        ) : p.monto_consumido_centavos > p.monto_pagado_centavos ? (
                          <span className="balance-pill debt">
                            Debe {centavosADinero(p.monto_consumido_centavos - p.monto_pagado_centavos)}
                          </span>
                        ) : p.monto_pagado_centavos > p.monto_consumido_centavos ? (
                          <span className="balance-pill credit">
                            +{centavosADinero(p.monto_pagado_centavos - p.monto_consumido_centavos)} a favor
                          </span>
                        ) : (
                          <span className="balance-pill neutral">Cabal</span>
                        )}
                      </div>
                    </div>

                    {/* Eliminar comensal si está vacío (Solo Organizador) */}
                    {isOrganizer && p.usuario_id !== evento.creador.id && p.monto_consumido_centavos === 0 && p.monto_pagado_centavos === 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(113, 119, 109, 0.2)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteParticipant(p.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--debt-text)',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Eliminar de la mesa</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lista de Invitaciones Enviadas Pendientes */}
            {evento.invitaciones_pendientes && evento.invitaciones_pendientes.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cabales-gray)', marginBottom: '8px' }}>
                  ⏳ Invitaciones enviadas ({evento.invitaciones_pendientes.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {evento.invitaciones_pendientes.map((inv) => (
                    <div
                      key={inv.id}
                      className="glass-card"
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px dashed rgba(113, 119, 109, 0.4)',
                        opacity: 0.85
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem'
                          }}
                        >
                          ⏳
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--cabales-offwhite)' }}>
                            {inv.nombre}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--cabales-gray)' }}>
                            Invitación pendiente de aceptar
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '4px', color: 'var(--cabales-gray)' }}>
                        Esperando comensal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acción de Cierre de Mesa (Exclusivo si la mesa está ACTIVA) */}
            {evento.estado === 'ACTIVO' && (
              isOrganizer ? (
                <div style={{ marginTop: '24px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleStartCloseTable}
                    style={{
                      background: isFacturaCubierta ? 'var(--cabales-green-primary)' : 'rgba(77, 190, 85, 0.85)',
                      height: '50px'
                    }}
                  >
                    <Lock size={18} />
                    <span>Cerrar Mesa & Conciliar Deudas</span>
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--cabales-gray)', marginTop: '8px' }}>
                    Aplica el algoritmo Greedy para calcular las transferencias mínimas y cobrar por WhatsApp.
                  </p>
                </div>
              ) : (
                <div
                  className="glass-card"
                  style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    marginTop: '24px',
                    border: '1px solid rgba(113, 119, 109, 0.3)',
                    background: 'rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--cabales-gray)' }}>
                    <Lock size={15} color="var(--cabales-green-mint)" />
                    <span>Mesa activa • Esperando que el organizador (<strong>{evento.creador.nombre}</strong>) cierre la cuenta</span>
                  </div>
                </div>
              )
            )}

            {isOrganizer && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Eliminar esta mesa</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB CUENTA DETALLADA */}
        {activeTab === 'CUENTA' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Consumos de la Cuenta</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--cabales-gray)', margin: '2px 0 0' }}>
                  Desglose plato por plato o rondas compartidas
                </p>
              </div>

              {evento.estado === 'ACTIVO' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.78rem', borderRadius: 'var(--radius-full)' }}
                    onClick={() => setIsTipModalOpen(true)}
                  >
                    <HeartHandshake size={13} />
                    <span>+ Propina</span>
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: 'var(--radius-full)', width: 'auto' }}
                    onClick={openCreateConsumoModal}
                  >
                    <Plus size={14} />
                    <span>+ Consumo</span>
                  </button>
                </div>
              )}
            </div>

            {consumos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cabales-gray)' }}>
                <Receipt size={32} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                <p style={{ fontSize: '0.9rem', margin: '0 0 16px' }}>No hay consumos anotados aún en esta mesa.</p>
                {evento.estado === 'ACTIVO' && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ maxWidth: '220px', margin: '0 auto' }}
                    onClick={openCreateConsumoModal}
                  >
                    + Anotar Primer Consumo
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {consumos.map((c) => (
                  <div key={c.id} className="glass-card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--cabales-offwhite)' }}>
                          {c.descripcion || 'Consumo sin descripción'}
                        </h4>
                        <span style={{ fontSize: '0.74rem', color: 'var(--cabales-gray)' }}>
                          Dividido entre {c.participantes.length} persona{c.participantes.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className="money-amount" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--cabales-offwhite)' }}>
                          {centavosADinero(c.monto_centavos)}
                        </span>
                      </div>
                    </div>

                    {/* Chips de personas */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {c.participantes.map((cp) => (
                        <span
                          key={cp.id}
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(113, 119, 109, 0.3)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            color: 'var(--cabales-offwhite)'
                          }}
                        >
                          {cp.nombre_visible} ({centavosADinero(cp.monto_centavos)})
                        </span>
                      ))}
                    </div>

                    {/* Acciones de edición si la mesa está ACTIVA (Solo Organizador) */}
                    {evento.estado === 'ACTIVO' && isOrganizer && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(113, 119, 109, 0.2)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => openEditConsumoModal(c)}
                          style={{ background: 'none', border: 'none', color: 'var(--cabales-gray)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        >
                          <Edit2 size={12} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConsumo(c.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--debt-text)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: INVITAR QR & WHATSAPP */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invitar a la Mesa"
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p style={{ color: 'var(--cabales-gray)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Tus amigos pueden escanear este código QR para unirse y ver la cuenta en tiempo real:
          </p>

          {qrCodeDataUrl && (
            <div
              style={{
                background: '#F1F1F1',
                padding: '16px',
                borderRadius: '16px',
                display: 'inline-block',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}
            >
              <img src={qrCodeDataUrl} alt="Código QR de la mesa" style={{ width: '220px', height: '220px', display: 'block' }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleShareInviteWhatsApp}
              style={{ background: '#25D366', color: '#141F14' }}
            >
              <Share2 size={18} />
              <span>Enviar Invitación por WhatsApp</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopyInviteLink}
            >
              <Copy size={16} />
              <span>Copiar Enlace de la Mesa</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: RECLAMAR / SENTARSE EN LA MESA */}
      <Modal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        title="Sentarme a la Mesa"
      >
        <form onSubmit={handleClaimSeat}>
          {!currentUserId && (
            <div className="cabales-input-group">
              <label className="cabales-label">¿Cómo te llamas?</label>
              <input
                type="text"
                className="cabales-input"
                placeholder="Ej. Jonathan"
                value={claimNameInput}
                onChange={(e) => setClaimNameInput(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Si hay comensales fantasma disponibles */}
          {evento.participantes.some((p) => p.es_fantasma) && (
            <div style={{ marginBottom: '16px' }}>
              <label className="cabales-label" style={{ display: 'block', marginBottom: '8px' }}>
                ¿Ya te habían anotado como comensal invitado?
              </label>
              <select
                className="cabales-input"
                value={selectedGhostId}
                onChange={(e) => setSelectedGhostId(e.target.value)}
              >
                <option value="">No, soy un comensal nuevo</option>
                {evento.participantes
                  .filter((p) => p.es_fantasma)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      👻 Reclamar asiento: {p.nombre_visible} ({centavosADinero(p.monto_consumido_centavos)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isClaiming || (!currentUserId && !claimNameInput.trim())}
          >
            {isClaiming ? 'Sentando...' : 'Confirmar y Entrar a la Mesa'}
          </button>
        </form>
      </Modal>

      {/* MODAL: AGREGAR COMENSAL */}
      <Modal
        isOpen={isAddParticipantModalOpen}
        onClose={() => setIsAddParticipantModalOpen(false)}
        title="Agregar Comensal a la Mesa"
      >
        <form onSubmit={handleAddParticipant}>
          {/* Selector de modo */}
          <div className="segmented-control" style={{ marginBottom: '16px' }}>
            <button
              type="button"
              className={`segment-btn ${addParticipantMode === 'GUEST' ? 'active' : ''}`}
              onClick={() => setAddParticipantMode('GUEST')}
            >
              👤 Como Invitado
            </button>
            <button
              type="button"
              className={`segment-btn ${addParticipantMode === 'FRIEND' ? 'active' : ''}`}
              onClick={() => setAddParticipantMode('FRIEND')}
            >
              🔑 Amigo Registrado
            </button>
          </div>

          {addParticipantMode === 'GUEST' ? (
            <div className="cabales-input-group">
              <label className="cabales-label">Nombre del comensal invitado</label>
              <input
                type="text"
                className="cabales-input"
                placeholder="Ej. Andrés, Vale, Tía Claudia"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                autoFocus
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--cabales-gray)', marginTop: '4px', display: 'block' }}>
                Para amigos o familiares que no tienen la app ni cuenta en Cabales.
              </span>
            </div>
          ) : (
            <div className="cabales-input-group">
              <label className="cabales-label">Código de Amigo (8 caracteres)</label>
              <input
                type="text"
                className="cabales-input"
                placeholder="Ej. 8B5501E9"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                maxLength={8}
                style={{ fontFamily: 'monospace', fontSize: '1.05rem', letterSpacing: '0.08em', fontWeight: 700 }}
                autoFocus
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--cabales-gray)', marginTop: '4px', display: 'block' }}>
                Ingresa el código único de 8 caracteres de tu amigo (visible en su perfil). Le llegará una notificación en vivo para aceptar y sentarse.
              </span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={
              isAddingParticipant ||
              (addParticipantMode === 'GUEST' ? !newParticipantName.trim() : !friendCodeInput.trim())
            }
            style={{ marginTop: '16px' }}
          >
            {isAddingParticipant ? 'Agregando...' : 'Sentar Comensal en la Mesa'}
          </button>
        </form>
      </Modal>

      {/* MODAL: AGREGAR / EDITAR CONSUMO */}
      <Modal
        isOpen={isConsumoModalOpen}
        onClose={() => setIsConsumoModalOpen(false)}
        title={editingConsumoId ? 'Editar Consumo' : 'Nuevo Consumo'}
      >
        <form onSubmit={handleSaveConsumo}>
          <div className="cabales-input-group">
            <label className="cabales-label">Descripción</label>
            <input
              type="text"
              className="cabales-input"
              placeholder="Ej. Pizza Familiar, Rondas de Cerveza, Postre"
              value={consumoDesc}
              onChange={(e) => setConsumoDesc(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="cabales-label" style={{ display: 'block', textAlign: 'center', marginBottom: '4px' }}>
              Monto del Consumo
            </label>
            <MoneyInput
              centavos={consumoCentavos}
              onChange={setConsumoCentavos}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="cabales-label" style={{ margin: 0 }}>
                ¿Quiénes consumieron? ({selectedParticipantsForConsumo.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedParticipantsForConsumo.length === evento.participantes.length) {
                    setSelectedParticipantsForConsumo([]);
                  } else {
                    setSelectedParticipantsForConsumo(evento.participantes.map((p) => p.id));
                  }
                }}
                style={{ fontSize: '0.74rem', color: 'var(--cabales-green-mint)', fontWeight: 700 }}
              >
                {selectedParticipantsForConsumo.length === evento.participantes.length
                  ? 'Desmarcar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
              {evento.participantes.map((p) => {
                const isSelected = selectedParticipantsForConsumo.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedParticipantsForConsumo((prev) => prev.filter((id) => id !== p.id));
                      } else {
                        setSelectedParticipantsForConsumo((prev) => [...prev, p.id]);
                      }
                    }}
                    style={{
                      background: isSelected ? 'rgba(77, 190, 85, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                      border: isSelected ? '1px solid var(--cabales-green-primary)' : '1px solid var(--border-card)',
                      color: isSelected ? 'var(--cabales-green-mint)' : 'var(--cabales-offwhite)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{p.nombre_visible}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSavingConsumo || consumoCentavos <= 0 || selectedParticipantsForConsumo.length === 0}
          >
            {isSavingConsumo
              ? 'Guardando...'
              : editingConsumoId
              ? 'Actualizar Consumo'
              : 'Anotar Consumo a la Cuenta'}
          </button>
        </form>
      </Modal>

      {/* MODAL: PROPINA */}
      <Modal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        title="Agregar Propina al Local"
      >
        <p style={{ color: 'var(--cabales-gray)', fontSize: '0.85rem', marginBottom: '16px' }}>
          La propina se calculará sobre el total consumido y se dividirá de forma equitativa entre todos los comensales.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
          {[10, 15, 20].map((pct) => (
            <button
              key={pct}
              type="button"
              className={`quick-chip ${tipPercentage === pct ? 'active' : ''}`}
              onClick={() => setTipPercentage(pct)}
              style={{
                fontSize: '1.05rem',
                padding: '10px 18px',
                background: tipPercentage === pct ? 'var(--cabales-green-primary)' : 'rgba(0,0,0,0.3)',
                color: tipPercentage === pct ? '#141F14' : 'var(--cabales-offwhite)',
                borderColor: tipPercentage === pct ? 'var(--cabales-green-primary)' : 'var(--border-card)'
              }}
            >
              {pct}%
            </button>
          ))}
        </div>

        <div
          style={{
            background: 'rgba(0, 0, 0, 0.28)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            textAlign: 'center',
            marginBottom: '20px'
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--cabales-gray)' }}>
            Monto estimado de propina:
          </span>
          <div className="money-amount" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cabales-green-mint)', marginTop: '4px' }}>
            {centavosADinero(Math.round((evento.total_gastado_centavos * tipPercentage) / 100))}
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleSaveTip}
          disabled={isSavingTip || evento.total_gastado_centavos <= 0}
        >
          {isSavingTip ? 'Calculando propina...' : `Aplicar Propina del ${tipPercentage}%`}
        </button>
      </Modal>

      {/* MODAL: REGISTRAR ABONO */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Registrar Abono al Local"
      >
        <p style={{ color: 'var(--cabales-gray)', fontSize: '0.85rem', marginBottom: '14px', textAlign: 'center' }}>
          Indica quién pagó y cuánto dinero abonó directamente al restaurante:
        </p>

        <div className="cabales-input-group" style={{ marginBottom: '16px' }}>
          <label className="cabales-label">Comensal que realiza el abono</label>
          {isOrganizer ? (
            <select
              className="cabales-input"
              value={payingParticipantId}
              onChange={(e) => setPayingParticipantId(e.target.value)}
            >
              {evento?.participantes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_visible} {p.usuario_id === currentUserId ? '(Tú)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div
              className="cabales-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-card)',
                color: 'var(--cabales-offwhite)'
              }}
            >
              <span>👤 {myParticipant?.nombre_visible || 'Tú'}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--cabales-green-mint)', fontWeight: 600 }}>
                Abono a tu propia cuenta
              </span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="cabales-label" style={{ display: 'block', textAlign: 'center', marginBottom: '4px' }}>
            Monto abonado
          </label>
          <MoneyInput
            centavos={paymentCentavos}
            onChange={setPaymentCentavos}
          />
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleSavePayment}
          disabled={isSavingPayment || paymentCentavos <= 0 || !payingParticipantId}
          style={{ marginTop: '16px' }}
        >
          {isSavingPayment ? 'Registrando...' : 'Confirmar Abono'}
        </button>
      </Modal>

      {/* MODAL: CERRAR MESA CON PAGADOR RESTANTE */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Conciliar y Cerrar Mesa"
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: '16px'
            }}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--debt-text)', fontWeight: 600 }}>
              Faltan {centavosADinero(saldoPendienteCentavos)} para cubrir la factura del restaurante.
            </span>
          </div>

          <p style={{ color: 'var(--cabales-gray)', fontSize: '0.86rem', lineHeight: 1.4, textAlign: 'left' }}>
            ¿Quién pagó o puso su tarjeta para cubrir esta diferencia restante? El sistema le asignará saldo a favor y los demás le transferirán a él:
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <select
            className="cabales-input"
            value={selectedPayerId}
            onChange={(e) => setSelectedPayerId(e.target.value)}
          >
            {evento.participantes.map((p) => (
              <option key={p.id} value={p.id}>
                💳 {p.nombre_visible} cubre el remanente
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={executeCloseTable}
          disabled={isClosingTable || !selectedPayerId}
        >
          {isClosingTable ? 'Conciliando mesa...' : 'Cerrar Mesa y Liquidar Deudas'}
        </button>
      </Modal>

      {/* MODAL: CONFIRMAR ELIMINAR MESA */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingTable) setIsDeleteModalOpen(false);
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
            ¿Estás seguro de que deseas eliminar esta mesa (
            <strong style={{ color: '#fff' }}>"{evento.nombre}"</strong>)?
            <br />
            Esta acción borrará la mesa permanentemente y desvinculará todos los consumos asociados.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingTable}
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
                cursor: isDeletingTable ? 'not-allowed' : 'pointer',
                padding: '10px 14px',
                fontSize: '0.88rem'
              }}
              onClick={handleDeleteTable}
              disabled={isDeletingTable}
            >
              {isDeletingTable ? 'Eliminando...' : 'Sí, eliminar mesa'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
