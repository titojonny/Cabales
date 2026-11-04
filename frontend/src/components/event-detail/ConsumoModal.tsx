import React from 'react';
import { Modal } from '../common/Modal';
import { MoneyInput } from '../common/MoneyInput';
import { ParticipanteDetalleDTO } from '../../types/cabales.types';

interface ConsumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  descripcion: string;
  onDescripcionChange: (val: string) => void;
  centavos: number;
  onCentavosChange: (val: number) => void;
  selectedParticipantIds: string[];
  onToggleParticipant: (id: string) => void;
  onSelectAllParticipants: () => void;
  onDeselectAllParticipants: () => void;
  participantes: ParticipanteDetalleDTO[];
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ConsumoModal: React.FC<ConsumoModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  descripcion,
  onDescripcionChange,
  centavos,
  onCentavosChange,
  selectedParticipantIds,
  onToggleParticipant,
  onSelectAllParticipants,
  onDeselectAllParticipants,
  participantes,
  isSaving,
  onSubmit
}) => {
  const allSelected = selectedParticipantIds.length === participantes.length && participantes.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Consumo' : 'Nuevo Consumo'}
    >
      <form onSubmit={onSubmit}>
        <div className="cabales-input-group">
          <label className="cabales-label">Descripción</label>
          <input
            type="text"
            className="cabales-input"
            placeholder="Ej. Pizza Familiar, Rondas de Cerveza, Postre"
            value={descripcion}
            onChange={(e) => onDescripcionChange(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="cabales-label" style={{ display: 'block', textAlign: 'center', marginBottom: '4px' }}>
            Monto del Consumo
          </label>
          <MoneyInput
            centavos={centavos}
            onChange={onCentavosChange}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="cabales-label" style={{ margin: 0 }}>
              ¿Quiénes consumieron? ({selectedParticipantIds.length})
            </label>
            <button
              type="button"
              onClick={allSelected ? onDeselectAllParticipants : onSelectAllParticipants}
              style={{ fontSize: '0.74rem', color: 'var(--cabales-green-mint)', fontWeight: 700 }}
            >
              {allSelected ? 'Desmarcar todos' : 'Seleccionar todos'}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
            {participantes.map((p) => {
              const isSelected = selectedParticipantIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggleParticipant(p.id)}
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
          disabled={isSaving || centavos <= 0 || selectedParticipantIds.length === 0}
        >
          {isSaving
            ? 'Guardando...'
            : isEditing
            ? 'Actualizar Consumo'
            : 'Anotar Consumo a la Cuenta'}
        </button>
      </form>
    </Modal>
  );
};
