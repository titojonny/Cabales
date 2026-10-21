import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Share2,
  Copy,
  Upload,
  Camera,
  Image as ImageIcon,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cabalesApi } from '../services/api.service';
import { useTableSocket, TableUpdateEvent } from '../services/socket.service';
import {
  EventoDetalleDTO,
  TransaccionDTO,
  EstadoTransaccion
} from '../types/cabales.types';
import { centavosADinero } from '../utils/currency';
import {
  generarMensajeCobroWhatsApp,
  compartirTexto,
  copiarTextoAlPortapapeles
} from '../utils/whatsapp';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';

export const SettlementPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bankDetails, setBankDetails, currentUserId, currentUser } = useAuth();
  const { showToast } = useToast();

  const [evento, setEvento] = useState<EventoDetalleDTO | null>(null);
  const [transactions, setTransactions] = useState<TransaccionDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal: Cobro por WhatsApp
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [customBankDetails, setCustomBankDetails] = useState<string>(bankDetails);

  // Modal: Subir Comprobante
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false);
  const [activeTxId, setActiveTxId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal: Visor de Comprobante
  const [isViewerModalOpen, setIsViewerModalOpen] = useState<boolean>(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string>('');

  const loadSettlementData = useCallback(async (silent = false) => {
    if (!eventId) return;
    if (!silent) setIsLoading(true);
    try {
      const [evData, txsData] = await Promise.all([
        cabalesApi.obtenerDetalleEvento(eventId),
        cabalesApi.obtenerTransacciones(eventId)
      ]);
      setEvento(evData);
      setTransactions(txsData || []);
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Error al cargar la liquidación de la mesa', 'error');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [eventId, showToast]);

  // Sincronización en tiempo real vía WebSockets en liquidación
  const { isConnected } = useTableSocket(
    eventId,
    useCallback((updateEvent: TableUpdateEvent) => {
      loadSettlementData(true);
      if (updateEvent.action === 'TRANSACCION_ACTUALIZADA') {
        showToast('⚡ Actualización de estado en una deuda', 'info');
      }
    }, [loadSettlementData, showToast])
  );

  useEffect(() => {
    loadSettlementData();
  }, [loadSettlementData]);

  // Sincronizar datos bancarios
  useEffect(() => {
    setCustomBankDetails(bankDetails);
  }, [bankDetails]);

  const completedCount = useMemo(() => {
    return transactions.filter((t) => t.estado === 'COMPLETADO').length;
  }, [transactions]);

  const allCompleted = useMemo(() => {
    return transactions.length > 0 && completedCount === transactions.length;
  }, [transactions, completedCount]);

  // Transiciones de estado de transacciones
  const advanceStatusDirect = async (txId: string, nuevoEstado: EstadoTransaccion) => {
    try {
      await cabalesApi.actualizarEstadoTransaccion(txId, { estado: nuevoEstado });
      showToast(
        nuevoEstado === 'COMPLETADO'
          ? '¡Transferencia confirmada como saldada!'
          : nuevoEstado === 'EN_DISPUTA'
          ? 'Transferencia marcada en disputa'
          : 'Estado actualizado',
        'success'
      );
      loadSettlementData();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar estado', 'error');
    }
  };

  // WhatsApp
  const handleOpenWhatsApp = () => {
    if (!evento) return;
    const texto = generarMensajeCobroWhatsApp(evento, transactions, customBankDetails);
    compartirTexto(`Cobro ${evento.nombre}`, texto);
  };

  const handleCopyWhatsAppMessage = async () => {
    if (!evento) return;
    const texto = generarMensajeCobroWhatsApp(evento, transactions, customBankDetails);
    const ok = await copiarTextoAlPortapapeles(texto);
    if (ok) {
      showToast('Mensaje de cobro copiado al portapapeles', 'success');
      setBankDetails(customBankDetails);
      setIsWhatsAppModalOpen(false);
    } else {
      showToast('No se pudo copiar el mensaje', 'error');
    }
  };

  // Subir Comprobante
  const openProofModal = (txId: string) => {
    setActiveTxId(txId);
    setSelectedFile(null);
    setPreviewUrl('');
    setIsProofModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadProof = async () => {
    if (!activeTxId || !selectedFile) return;

    setIsUploadingProof(true);
    try {
      await cabalesApi.subirComprobante(activeTxId, selectedFile);
      showToast('Comprobante subido. La transferencia pasó a revisión.', 'success');
      setIsProofModalOpen(false);
      loadSettlementData();
    } catch (err: any) {
      showToast(err.message || 'Error al subir comprobante', 'error');
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Visor de comprobante
  const openReceiptViewer = (tx: TransaccionDTO) => {
    const url = cabalesApi.resolverUrlComprobante(tx.comprobante_url);
    setViewingReceiptUrl(url);
    setIsViewerModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="mobile-app-wrapper" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--cabales-gray)' }}>
          <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: '12px' }}>
            <Sparkles size={32} color="var(--cabales-green-primary)" />
          </div>
          <p>Calculando transferencias mínimas...</p>
        </div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="mobile-app-wrapper" style={{ padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--debt-text)" style={{ margin: '40px auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No se pudo cargar la liquidación</h3>
        <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Es posible que la mesa aún no esté cerrada o haya un problema de conexión.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate(`/events/${eventId}`)}
        >
          Volver a la Mesa
        </button>
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
            onClick={() => navigate(`/events/${eventId}`)}
            aria-label="Volver a la mesa"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="nav-center-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>Liquidación de Mesa</span>
            {isConnected && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: 'var(--cabales-green-mint)',
                  background: 'rgba(77, 190, 85, 0.15)',
                  border: '1px solid rgba(77, 190, 85, 0.35)',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#4dbe55',
                    boxShadow: '0 0 5px #4dbe55'
                  }}
                />
                En vivo
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            style={{
              background: '#25D366',
              color: '#141F14',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Share2 size={13} />
            <span>Cobrar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '16px 16px 80px' }}>
        {/* Banner Celebratorio o en Proceso */}
        <div
          className="glass-card"
          style={{
            padding: '22px 20px',
            marginBottom: '16px',
            textAlign: 'center',
            background: allCompleted
              ? 'linear-gradient(135deg, rgba(77, 190, 85, 0.2) 0%, rgba(33, 38, 32, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(33, 38, 32, 0.95) 0%, rgba(20, 26, 20, 0.95) 100%)'
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: allCompleted ? 'rgba(77, 190, 85, 0.25)' : 'rgba(113, 119, 109, 0.25)',
              border: allCompleted ? '1px solid var(--cabales-green-primary)' : '1px solid var(--border-card)',
              color: allCompleted ? 'var(--cabales-green-mint)' : 'var(--cabales-offwhite)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}
          >
            {allCompleted ? <Sparkles size={28} /> : <ShieldCheck size={28} />}
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {allCompleted ? '¡Todos Cabales!' : 'Flujo Mínimo de Efectivo'}
          </h2>

          <p style={{ fontSize: '0.86rem', color: 'var(--cabales-gray)', lineHeight: 1.45, margin: 0 }}>
            {allCompleted
              ? 'Todas las transferencias han sido completadas con éxito. Nadie le debe nada a nadie.'
              : `El motor matemático optimizó la mesa para saldar todas las deudas con solo ${transactions.length} transferencia${transactions.length > 1 ? 's' : ''}.`}
          </p>
        </div>

        {/* Banner de Cobro WhatsApp Interactivo */}
        <div
          className="glass-card"
          style={{
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            border: '1px solid rgba(37, 211, 102, 0.35)',
            background: 'rgba(37, 211, 102, 0.08)'
          }}
          onClick={() => setIsWhatsAppModalOpen(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#25D366',
                color: '#141F14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Share2 size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: 'var(--cabales-offwhite)' }}>
                Cobrar al Grupo por WhatsApp
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--cabales-gray)', margin: '2px 0 0' }}>
                Envía el desglose de transferencias y tu cuenta bancaria
              </p>
            </div>
          </div>

          <ArrowRight size={18} color="var(--cabales-green-mint)" />
        </div>

        {/* Listado de Transferencias Requeridas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              Transferencias Requeridas
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--cabales-green-mint)', fontWeight: 700 }}>
              {completedCount} de {transactions.length} saldadas
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="glass-card" style={{ padding: '30px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎉</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px' }}>
                ¡No se requirieron transferencias!
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--cabales-gray)', margin: 0 }}>
                Todos los comensales cubrieron exactamente lo que consumieron.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {transactions.map((t) => {
                const isCompleted = t.estado === 'COMPLETADO';
                return (
                  <div
                    key={t.id}
                    className="glass-card"
                    style={{
                      padding: '16px',
                      opacity: isCompleted ? 0.75 : 1,
                      border: isCompleted ? '1px solid rgba(121, 237, 145, 0.3)' : '1px solid var(--border-card)'
                    }}
                  >
                    {/* Fila Deudor -> Flecha -> Acreedor */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      {/* Deudor */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '38%' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: 'var(--debt-text)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            marginBottom: '4px'
                          }}
                        >
                          {t.deudor.nombre_visible.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', wordBreak: 'break-word' }}>
                          {t.deudor.nombre_visible}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--debt-text)' }}>Transfiere</span>
                      </div>

                      {/* Monto Central con Flecha */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24%' }}>
                        <span className="money-amount" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--cabales-offwhite)' }}>
                          {centavosADinero(t.monto_centavos)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--cabales-green-mint)', marginTop: '2px' }}>
                          <ArrowRight size={18} />
                        </div>
                      </div>

                      {/* Acreedor */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '38%' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(121, 237, 145, 0.2)',
                            border: '1px solid rgba(121, 237, 145, 0.4)',
                            color: 'var(--credit-text)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            marginBottom: '4px'
                          }}
                        >
                          {t.acreedor.nombre_visible.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', wordBreak: 'break-word' }}>
                          {t.acreedor.nombre_visible}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--credit-text)' }}>Recibe</span>
                      </div>
                    </div>

                    {/* Fila de Estado & Comprobante */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(113, 119, 109, 0.25)', marginBottom: isCompleted ? 0 : '12px' }}>
                      <StatusBadge status={t.estado} />
                      {t.comprobante_url && (
                        <button
                          type="button"
                          onClick={() => openReceiptViewer(t)}
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border-card)',
                            color: 'var(--cabales-green-mint)',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <ImageIcon size={13} />
                          <span>Ver Comprobante</span>
                        </button>
                      )}
                    </div>

                    {/* Acciones según el estado del ciclo de vida y rol del usuario */}
                    {(() => {
                      const userEmailLower = currentUser?.email?.toLowerCase();

                      const soyDeudor =
                        !!currentUserId &&
                        (t.deudor.usuario_id === currentUserId ||
                          (!!userEmailLower && (t.deudor as any).email?.toLowerCase() === userEmailLower));

                      const soyAcreedor =
                        !!currentUserId &&
                        (t.acreedor.usuario_id === currentUserId ||
                          (!!userEmailLower && (t.acreedor as any).email?.toLowerCase() === userEmailLower));

                      const isOrganizer =
                        !!currentUserId &&
                        !!evento &&
                        (evento.creador.id === currentUserId ||
                          (!!userEmailLower && (evento.creador as any).email?.toLowerCase() === userEmailLower));

                      const acreedorEsFantasma = !t.acreedor.usuario_id;
                      const deudorEsFantasma = !t.deudor.usuario_id;

                      // Regla de Permisos sin conflictos de intereses:
                      // 1. Subir comprobante / notificar: el deudor, o el organizador si el deudor es invitado sin cuenta
                      const puedeSubirComprobante = soyDeudor || (isOrganizer && deudorEsFantasma);

                      // 2. Confirmar recepción: el acreedor (dueño del dinero), o el organizador si el acreedor es invitado sin cuenta
                      // NUNCA si soy el deudor (el deudor no puede autovalidar su propio pago)
                      const puedeConfirmarPago = (soyAcreedor || (isOrganizer && acreedorEsFantasma)) && !soyDeudor;

                      return (
                        <div>
                          {/* Badge de Rol Personal en esta deuda */}
                          <div style={{ marginBottom: '10px' }}>
                            {soyDeudor && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: 'var(--debt-text)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}
                              >
                                <span>⚠️ Tu Deuda: Debes transferir tú</span>
                              </span>
                            )}
                            {soyAcreedor && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(77, 190, 85, 0.15)',
                                  border: '1px solid rgba(77, 190, 85, 0.4)',
                                  color: 'var(--cabales-green-mint)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}
                              >
                                <span>💰 Por Cobrar: Te deben transferir a ti</span>
                              </span>
                            )}
                            {!soyDeudor && !soyAcreedor && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(113, 119, 109, 0.15)',
                                  border: '1px solid rgba(113, 119, 109, 0.28)',
                                  color: 'var(--cabales-gray)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600
                                }}
                              >
                                <span>👥 Transferencia entre comensales</span>
                              </span>
                            )}
                          </div>

                          {/* Estado PENDIENTE */}
                          {t.estado === 'PENDIENTE' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {puedeSubirComprobante && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    style={{
                                      width: '100%',
                                      fontSize: '0.82rem',
                                      padding: '9px 12px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px'
                                    }}
                                    onClick={() => openProofModal(t.id)}
                                  >
                                    <Upload size={14} />
                                    <span>Subir Comprobante de Transferencia</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{
                                      width: '100%',
                                      fontSize: '0.78rem',
                                      padding: '7px 12px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px'
                                    }}
                                    onClick={() => advanceStatusDirect(t.id, 'EN_REVISION')}
                                  >
                                    <Clock size={13} />
                                    <span>Ya transferí (Notificar a {t.acreedor.nombre_visible})</span>
                                  </button>
                                </div>
                              )}

                              {puedeConfirmarPago && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{
                                    width: '100%',
                                    fontSize: '0.82rem',
                                    padding: '9px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    color: 'var(--cabales-green-mint)',
                                    borderColor: 'rgba(77, 190, 85, 0.4)'
                                  }}
                                  onClick={() => advanceStatusDirect(t.id, 'COMPLETADO')}
                                >
                                  <DollarSign size={15} />
                                  <span>
                                    {soyAcreedor
                                      ? 'Recibí el Pago (Efectivo o Transferencia)'
                                      : `Recibí el Pago (en nombre de ${t.acreedor.nombre_visible})`}
                                  </span>
                                </button>
                              )}

                              {!puedeSubirComprobante && !puedeConfirmarPago && (
                                <div
                                  style={{
                                    textAlign: 'center',
                                    fontSize: '0.76rem',
                                    color: 'var(--cabales-gray)',
                                    padding: '4px 0'
                                  }}
                                >
                                  <span>
                                    {soyDeudor
                                      ? `Debes transferir ${centavosADinero(t.monto_centavos)} a ${t.acreedor.nombre_visible}.`
                                      : `Esperando que ${t.deudor.nombre_visible} transfiera a ${t.acreedor.nombre_visible}.`}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Estado EN_REVISION */}
                          {t.estado === 'EN_REVISION' && (
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.75rem',
                                  color: 'var(--cabales-gray)',
                                  marginBottom: '10px'
                                }}
                              >
                                <Clock size={14} color="var(--cabales-green-mint)" />
                                <span>
                                  {puedeConfirmarPago
                                    ? `${t.deudor.nombre_visible} envió su comprobante. Revisa tu cuenta y confirma:`
                                    : soyDeudor
                                    ? `Comprobante enviado. Esperando que ${t.acreedor.nombre_visible} verifique en su cuenta y confirme.`
                                    : `${t.deudor.nombre_visible} envió comprobante a ${t.acreedor.nombre_visible}. Esperando validación.`}
                                </span>
                              </div>

                              {puedeConfirmarPago ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ fontSize: '0.8rem', padding: '9px' }}
                                    onClick={() => advanceStatusDirect(t.id, 'COMPLETADO')}
                                  >
                                    <CheckCircle2 size={14} />
                                    <span>Confirmar Recibido</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ fontSize: '0.8rem', padding: '9px', color: 'var(--debt-text)' }}
                                    onClick={() => advanceStatusDirect(t.id, 'EN_DISPUTA')}
                                  >
                                    <AlertCircle size={14} />
                                    <span>Disputar Pago</span>
                                  </button>
                                </div>
                              ) : puedeSubirComprobante ? (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ width: '100%', fontSize: '0.76rem', padding: '6px' }}
                                  onClick={() => openProofModal(t.id)}
                                >
                                  <Upload size={13} />
                                  <span>Reemplazar comprobante</span>
                                </button>
                              ) : null}
                            </div>
                          )}

                          {/* Estado EN_DISPUTA */}
                          {t.estado === 'EN_DISPUTA' && (
                            <div>
                              <div
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  fontSize: '0.75rem',
                                  color: 'var(--debt-text)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginBottom: '10px'
                                }}
                              >
                                <AlertCircle size={15} />
                                <span>
                                  {soyAcreedor || soyDeudor
                                    ? 'Pago en disputa. Verifiquen la transferencia entre ustedes o adjunten nuevo comprobante.'
                                    : `Pago en disputa entre ${t.deudor.nombre_visible} y ${t.acreedor.nombre_visible}.`}
                                </span>
                              </div>

                              {puedeSubirComprobante && (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{
                                    width: '100%',
                                    fontSize: '0.8rem',
                                    padding: '8px',
                                    marginBottom: puedeConfirmarPago ? '8px' : 0
                                  }}
                                  onClick={() => openProofModal(t.id)}
                                >
                                  <Upload size={14} />
                                  <span>Subir Nuevo Comprobante</span>
                                </button>
                              )}

                              {puedeConfirmarPago && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{
                                    width: '100%',
                                    fontSize: '0.8rem',
                                    padding: '8px',
                                    color: 'var(--cabales-green-mint)'
                                  }}
                                  onClick={() => advanceStatusDirect(t.id, 'COMPLETADO')}
                                >
                                  <CheckCircle2 size={14} />
                                  <span>Resolver & Confirmar Pago</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {isCompleted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--cabales-green-mint)', fontWeight: 700 }}>
                        <CheckCircle2 size={14} />
                        <span>Transferencia saldada</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: COBRAR POR WHATSAPP */}
      <Modal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title="Cobrar Mesa por WhatsApp"
      >
        <p style={{ color: 'var(--cabales-gray)', fontSize: '0.85rem', marginBottom: '14px', lineHeight: 1.4 }}>
          Puedes incluir tu cuenta de banco (BAC, Agrícola, Chivo, Cuscatlán) para que tus amigos te transfieran al instante:
        </p>

        <div className="cabales-input-group">
          <label className="cabales-label">Tus Datos Bancarios</label>
          <textarea
            className="cabales-input"
            rows={3}
            placeholder="Ej. Banco Agrícola 001234567 a nombre de Jonathan, o Chivo @usuario"
            value={customBankDetails}
            onChange={(e) => setCustomBankDetails(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Vista Previa del Mensaje */}
        <div style={{ marginBottom: '16px' }}>
          <label className="cabales-label">Vista previa del mensaje</label>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontSize: '0.75rem',
              color: 'var(--cabales-offwhite)',
              whiteSpace: 'pre-wrap',
              maxHeight: '160px',
              overflowY: 'auto',
              fontFamily: 'monospace'
            }}
          >
            {generarMensajeCobroWhatsApp(evento, transactions, customBankDetails)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenWhatsApp}
            style={{ background: '#25D366', color: '#141F14' }}
          >
            <Share2 size={18} />
            <span>Abrir WhatsApp y Enviar</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopyWhatsAppMessage}
          >
            <Copy size={16} />
            <span>Copiar Texto Completo</span>
          </button>
        </div>
      </Modal>

      {/* MODAL: SUBIR COMPROBANTE */}
      <Modal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        title="Adjuntar Comprobante"
      >
        <p style={{ color: 'var(--cabales-gray)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Sube una captura de pantalla de tu transferencia bancaria para que el acreedor la verifique:
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragOver ? 'var(--cabales-green-mint)' : 'rgba(113, 119, 109, 0.4)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '30px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragOver ? 'rgba(77, 190, 85, 0.1)' : 'rgba(0, 0, 0, 0.25)',
              marginBottom: '20px',
              transition: 'all 0.2s ease'
            }}
          >
            <Camera size={36} color="var(--cabales-green-mint)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--cabales-offwhite)' }}>
              Toca para elegir de tu galería
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--cabales-gray)', marginTop: '4px' }}>
              o arrastra la imagen aquí (JPG, PNG, WEBP)
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <img
              src={previewUrl}
              alt="Vista previa del comprobante"
              style={{
                maxWidth: '100%',
                maxHeight: '220px',
                borderRadius: '12px',
                border: '1px solid var(--border-card)',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto 10px'
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '0.8rem', color: 'var(--cabales-green-mint)', textDecoration: 'underline' }}
            >
              Cambiar imagen
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={handleUploadProof}
          disabled={isUploadingProof || !selectedFile}
        >
          {isUploadingProof ? 'Subiendo comprobante...' : 'Confirmar y Enviar a Revisión'}
        </button>
      </Modal>

      {/* MODAL: VISOR DE COMPROBANTE */}
      <Modal
        isOpen={isViewerModalOpen}
        onClose={() => setIsViewerModalOpen(false)}
        title="Comprobante Adjunto"
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src={viewingReceiptUrl}
            alt="Comprobante de pago"
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '12px',
              border: '1px solid var(--border-card)',
              objectFit: 'contain',
              marginBottom: '16px'
            }}
          />

          <a
            href={viewingReceiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ display: 'inline-flex', width: 'auto' }}
          >
            <ExternalLink size={16} />
            <span>Abrir en tamaño original</span>
          </a>
        </div>
      </Modal>
    </div>
  );
};
