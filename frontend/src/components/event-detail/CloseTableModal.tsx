import React from 'react';
import { Modal } from '../common/Modal';
import { ParticipanteDetalleDTO } from '../../types/cabales.types';
import { centavosADinero } from '../../utils/currency';

interface CloseTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  saldoPendienteCentavos: number;
  participantes: ParticipanteDetalleDTO[];
  selectedPayerId: string;
  onSelectedPayerIdChange: (id: string) => void;
  isClosing: boolean;
  onSubmit: () => void;
}

export const CloseTableModal: React.FC<CloseTableModalProps> = ({
  isOpen,
  onClose,
  saldoPendienteCentavos,
  participantes,
  selectedPayerId,
  onSelectedPayerIdChange,
  isClosing,
  onSubmit
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
          onChange={(e) => onSelectedPayerIdChange(e.target.value)}
        >
          {participantes.map((p) => (
            <option key={p.id} value={p.id}>
              💳 {p.nombre_visible} cubre el remanente
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={onSubmit}
        disabled={isClosing || !selectedPayerId}
      >
        {isClosing ? 'Conciliando mesa...' : 'Cerrar Mesa y Liquidar Deudas'}
      </button>
    </Modal>
  );
};
