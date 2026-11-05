import React from 'react';
import { Modal } from '../common/Modal';

interface DeleteTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteTableModal: React.FC<DeleteTableModalProps> = ({
  isOpen,
  onClose,
  tableName,
  isDeleting,
  onConfirm
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
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
          <strong style={{ color: '#fff' }}>"{tableName}"</strong>)?
          <br />
          Esta acción borrará la mesa permanentemente y desvinculará todos los consumos asociados.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
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
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              padding: '10px 14px',
              fontSize: '0.88rem'
            }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Sí, eliminar mesa'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

