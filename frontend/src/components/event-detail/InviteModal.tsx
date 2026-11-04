import React from 'react';
import { Modal } from '../common/Modal';
import { Share2, Copy } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeDataUrl: string | null;
  onShareWhatsApp: () => void;
  onCopyInviteLink: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  qrCodeDataUrl,
  onShareWhatsApp,
  onCopyInviteLink
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invitar a la Mesa">
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
            onClick={onShareWhatsApp}
            style={{ background: '#25D366', color: '#141F14' }}
          >
            <Share2 size={18} />
            <span>Enviar Invitación por WhatsApp</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onCopyInviteLink}
          >
            <Copy size={16} />
            <span>Copiar Enlace de la Mesa</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
