import React from 'react';
import { Modal } from '../common/Modal';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'GUEST' | 'FRIEND';
  onModeChange: (mode: 'GUEST' | 'FRIEND') => void;
  guestName: string;
  onGuestNameChange: (val: string) => void;
  friendCode: string;
  onFriendCodeChange: (val: string) => void;
  isAdding: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  guestName,
  onGuestNameChange,
  friendCode,
  onFriendCodeChange,
  isAdding,
  onSubmit
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar Comensal a la Mesa">
      <form onSubmit={onSubmit}>
        {/* Selector de modo */}
        <div className="segmented-control" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`segment-btn ${mode === 'GUEST' ? 'active' : ''}`}
            onClick={() => onModeChange('GUEST')}
          >
            👤 Como Invitado
          </button>
          <button
            type="button"
            className={`segment-btn ${mode === 'FRIEND' ? 'active' : ''}`}
            onClick={() => onModeChange('FRIEND')}
          >
            🔑 Amigo Registrado
          </button>
        </div>

        {mode === 'GUEST' ? (
          <div className="cabales-input-group">
            <label className="cabales-label">Nombre del comensal invitado</label>
            <input
              type="text"
              className="cabales-input"
              placeholder="Ej. Andrés, Vale, Tía Claudia"
              value={guestName}
              onChange={(e) => onGuestNameChange(e.target.value)}
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
              value={friendCode}
              onChange={(e) => onFriendCodeChange(e.target.value.toUpperCase())}
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
          disabled={isAdding || (mode === 'GUEST' ? !guestName.trim() : !friendCode.trim())}
          style={{ marginTop: '16px' }}
        >
          {isAdding ? 'Agregando...' : 'Sentar Comensal en la Mesa'}
        </button>
      </form>
    </Modal>
  );
};
