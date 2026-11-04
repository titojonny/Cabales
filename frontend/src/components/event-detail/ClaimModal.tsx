import React from 'react';
import { Modal } from '../common/Modal';
import { ParticipanteDetalleDTO } from '../../types/cabales.types';
import { centavosADinero } from '../../utils/currency';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  claimNameInput: string;
  onClaimNameChange: (val: string) => void;
  selectedGhostId: string;
  onSelectGhostChange: (val: string) => void;
  participantes: ParticipanteDetalleDTO[];
  isClaiming: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  claimNameInput,
  onClaimNameChange,
  selectedGhostId,
  onSelectGhostChange,
  participantes,
  isClaiming,
  onSubmit
}) => {
  const hasGhostParticipants = participantes.some((p) => p.es_fantasma);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sentarme a la Mesa">
      <form onSubmit={onSubmit}>
        {!currentUserId && (
          <div className="cabales-input-group">
            <label className="cabales-label">¿Cómo te llamas?</label>
            <input
              type="text"
              className="cabales-input"
              placeholder="Ej. Jonathan"
              value={claimNameInput}
              onChange={(e) => onClaimNameChange(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Si hay comensales fantasma disponibles */}
        {hasGhostParticipants && (
          <div style={{ marginBottom: '16px' }}>
            <label className="cabales-label" style={{ display: 'block', marginBottom: '8px' }}>
              ¿Ya te habían anotado como comensal invitado?
            </label>
            <select
              className="cabales-input"
              value={selectedGhostId}
              onChange={(e) => onSelectGhostChange(e.target.value)}
            >
              <option value="">No, soy un comensal nuevo</option>
              {participantes
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
  );
};
