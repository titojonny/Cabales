import React from 'react';
import { Modal } from '../common/Modal';
import { centavosADinero } from '../../utils/currency';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipPercentage: number;
  onTipPercentageChange: (pct: number) => void;
  totalGastadoCentavos: number;
  isSaving: boolean;
  onSubmit: () => void;
}

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  tipPercentage,
  onTipPercentageChange,
  totalGastadoCentavos,
  isSaving,
  onSubmit
}) => {
  const estimatedTipCentavos = Math.round((totalGastadoCentavos * tipPercentage) / 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
            onClick={() => onTipPercentageChange(pct)}
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
          {centavosADinero(estimatedTipCentavos)}
        </div>
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={onSubmit}
        disabled={isSaving || totalGastadoCentavos <= 0}
      >
        {isSaving ? 'Calculando propina...' : `Aplicar Propina del ${tipPercentage}%`}
      </button>
    </Modal>
  );
};
