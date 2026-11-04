import React from 'react';
import { Modal } from '../common/Modal';
import { MoneyInput } from '../common/MoneyInput';
import { ParticipanteDetalleDTO } from '../../types/cabales.types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOrganizer: boolean;
  participantes: ParticipanteDetalleDTO[];
  payingParticipantId: string;
  onPayingParticipantIdChange: (id: string) => void;
  currentUserId: string | null;
  myParticipantName?: string;
  paymentCentavos: number;
  onPaymentCentavosChange: (centavos: number) => void;
  isSaving: boolean;
  onSubmit: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  isOrganizer,
  participantes,
  payingParticipantId,
  onPayingParticipantIdChange,
  currentUserId,
  myParticipantName,
  paymentCentavos,
  onPaymentCentavosChange,
  isSaving,
  onSubmit
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
            onChange={(e) => onPayingParticipantIdChange(e.target.value)}
          >
            {participantes.map((p) => (
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
            <span>👤 {myParticipantName || 'Tú'}</span>
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
          onChange={onPaymentCentavosChange}
        />
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={onSubmit}
        disabled={isSaving || paymentCentavos <= 0 || !payingParticipantId}
        style={{ marginTop: '16px' }}
      >
        {isSaving ? 'Registrando...' : 'Confirmar Abono'}
      </button>
    </Modal>
  );
};
