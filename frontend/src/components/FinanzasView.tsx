import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Share2,
  Sparkles,
  Lock,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cabalesApi } from '../services/api.service';
import { ResumenFinancieroDTO, DeudaAmigoDTO } from '../types/cabales.types';
import { centavosADinero } from '../utils/currency';
import { generarMensajeRecordatorioDeuda, compartirTexto } from '../utils/whatsapp';

interface FinanzasViewProps {
  onOpenRegisterModal: () => void;
}

export const FinanzasView: React.FC<FinanzasViewProps> = ({ onOpenRegisterModal }) => {
  const { currentUserId, hasFullAccount, bankDetails } = useAuth();
  const { showToast } = useToast();

  const [resumen, setResumen] = useState<ResumenFinancieroDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadFinancialData = useCallback(async () => {
    if (!currentUserId || !hasFullAccount) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await cabalesApi.obtenerResumenFinanciero(currentUserId);
      setResumen(data);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar finanzas', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, hasFullAccount, showToast]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const handleRemindDebtor = (deudor: DeudaAmigoDTO) => {
    const texto = generarMensajeRecordatorioDeuda(
      deudor.nombre,
      deudor.total_centavos,
      deudor.transacciones,
      bankDetails
    );
    compartirTexto(`Cobro Cabales - ${deudor.nombre}`, texto);
  };

  // Si no tiene cuenta registrada -> Pantalla de Desbloqueo Premium
  if (!hasFullAccount) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 8px 40px' }}>
        <div
          className="glass-card"
          style={{
            padding: '28px 20px',
            border: '1px solid rgba(77, 190, 85, 0.4)',
            background: 'linear-gradient(135deg, rgba(33, 38, 32, 0.95) 0%, rgba(20, 26, 20, 0.95) 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(77, 190, 85, 0.16)',
              border: '1px solid var(--cabales-green-primary)',
              color: 'var(--cabales-green-mint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <Lock size={28} />
          </div>

          <span className="brand-badge" style={{ marginBottom: '10px' }}>
            <Sparkles size={12} /> EXCLUSIVO USUARIOS CON CUENTA
          </span>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cabales-offwhite)', margin: '8px 0 10px', letterSpacing: '-0.02em' }}>
            Desbloquea tus Finanzas Personales & Control de Deudas
          </h3>

          <p style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '22px' }}>
            Registra tu cuenta gratis en 1 clic para acceder a:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: 'var(--cabales-offwhite)' }}>
              <CheckCircle2 size={18} color="var(--cabales-green-mint)" />
              <span><strong>Historial permanente</strong> de todas tus salidas sin límites.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: 'var(--cabales-offwhite)' }}>
              <CheckCircle2 size={18} color="var(--cabales-green-mint)" />
              <span><strong>"¿Quién te debe?"</strong>: suma consolidada de deudas de amigos.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: 'var(--cabales-green-mint)' }}>
              <CheckCircle2 size={18} color="var(--cabales-green-mint)" />
              <span><strong>Gasto total del mes</strong> en salidas y ticket promedio.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: 'var(--cabales-green-mint)' }}>
              <CheckCircle2 size={18} color="var(--cabales-green-mint)" />
              <span><strong>Cobros con 1 toque</strong> por WhatsApp con desglose incluido.</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={onOpenRegisterModal}
            style={{ height: '48px', fontSize: '0.98rem' }}
          >
            Crear Mi Cuenta Gratis en 1 Clic ➔
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cabales-gray)' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: '12px' }}>
          <Sparkles size={28} color="var(--cabales-green-primary)" />
        </div>
        <p>Calculando tu radiografía financiera...</p>
      </div>
    );
  }

  if (!resumen) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 3 Tarjetas KPI Principales */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(33, 38, 32, 0.95) 0%, rgba(20, 26, 20, 0.95) 100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--cabales-gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Gastos en Salidas
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--cabales-green-mint)', fontWeight: 700, background: 'rgba(77, 190, 85, 0.16)', padding: '2px 8px', borderRadius: '9999px', border: '1px solid rgba(77, 190, 85, 0.35)' }}>
            Este mes: {centavosADinero(resumen.total_gastado_mes_centavos)}
          </span>
        </div>

        <div className="money-amount" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--cabales-offwhite)', lineHeight: 1.1, marginBottom: '6px' }}>
          {centavosADinero(resumen.total_gastado_historico_centavos)}
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--cabales-gray)' }}>
          <span>{resumen.total_salidas} salidas registradas</span>
          <span>•</span>
          <span>Ticket prom: <strong>{centavosADinero(resumen.ticket_promedio_centavos)}</strong></span>
        </div>
      </div>

      {/* Grid: Te Deben vs Debes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Te deben */}
        <div
          className="glass-card"
          style={{
            padding: '16px 14px',
            border: '1px solid rgba(121, 237, 145, 0.35)',
            background: 'rgba(121, 237, 145, 0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <ArrowDownLeft size={16} color="var(--cabales-green-mint)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cabales-green-mint)', textTransform: 'uppercase' }}>
              Te Deben
            </span>
          </div>
          <div className="money-amount" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--cabales-green-mint)' }}>
            {centavosADinero(resumen.total_por_cobrar_centavos)}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--cabales-gray)' }}>
            {resumen.quien_me_debe.length} persona{resumen.quien_me_debe.length === 1 ? '' : 's'} pendiente{resumen.quien_me_debe.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Debes */}
        <div
          className="glass-card"
          style={{
            padding: '16px 14px',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <ArrowUpRight size={16} color="var(--debt-text)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--debt-text)', textTransform: 'uppercase' }}>
              Debes
            </span>
          </div>
          <div className="money-amount" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--debt-text)' }}>
            {centavosADinero(resumen.total_por_pagar_centavos)}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--cabales-gray)' }}>
            {resumen.a_quien_le_debo.length} compromiso{resumen.a_quien_le_debo.length === 1 ? '' : 's'} pendiente{resumen.a_quien_le_debo.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Sección: ¿Quién te debe? */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>¿Quién te debe dinero?</h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--cabales-gray)', margin: '2px 0 0' }}>
              Cuentas por cobrar acumuladas entre todas tus mesas
            </p>
          </div>
        </div>

        {resumen.quien_me_debe.length === 0 ? (
          <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--cabales-offwhite)' }}>
              ¡Todos están cabales contigo!
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--cabales-gray)', margin: 0 }}>
              No tienes transferencias pendientes por cobrar de ninguna salida.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resumen.quien_me_debe.map((d, index) => (
              <div key={index} className="glass-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(77, 190, 85, 0.2)',
                        border: '1px solid var(--cabales-green-primary)',
                        color: 'var(--cabales-green-mint)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}
                    >
                      {d.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: 'var(--cabales-offwhite)' }}>
                        {d.nombre}
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--cabales-gray)' }}>
                        {d.transacciones.length} salida{d.transacciones.length > 1 ? 's' : ''} pendiente{d.transacciones.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="money-amount" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cabales-green-mint)' }}>
                      {centavosADinero(d.total_centavos)}
                    </span>
                  </div>
                </div>

                {/* Desglose de mesas */}
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px' }}>
                  {d.transacciones.map((t) => (
                    <div key={t.transaccion_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--cabales-offwhite)', padding: '2px 0' }}>
                      <span style={{ color: 'var(--cabales-gray)' }}>• {t.evento_nombre}</span>
                      <span className="tabular-nums font-semibold">{centavosADinero(t.monto_centavos)}</span>
                    </div>
                  ))}
                </div>

                {/* Botón directo de WhatsApp */}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleRemindDebtor(d)}
                  style={{
                    background: '#25D366',
                    color: '#141F14',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    height: 'auto'
                  }}
                >
                  <Share2 size={14} />
                  <span>Recordar por WhatsApp</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección: Tus Deudas Pendientes */}
      {resumen.a_quien_le_debo.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 10px' }}>
            Tus Deudas Pendientes
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {resumen.a_quien_le_debo.map((a, index) => (
              <div key={index} className="glass-card" style={{ padding: '12px 14px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--cabales-offwhite)' }}>
                      Le debes a {a.nombre}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cabales-gray)', marginTop: '2px' }}>
                      {a.transacciones.map((t) => t.evento_nombre).join(', ')}
                    </div>
                  </div>
                  <span className="money-amount" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--debt-text)' }}>
                    {centavosADinero(a.total_centavos)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
