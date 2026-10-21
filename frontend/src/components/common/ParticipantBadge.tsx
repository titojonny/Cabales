import React from 'react';

interface ParticipantBadgeProps {
  name: string;
  isGhost?: boolean;
}

export const ParticipantBadge: React.FC<ParticipantBadgeProps> = ({ name, isGhost = false }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className={`participant-item ${isGhost ? 'is-ghost' : ''}`}>
      <div className="avatar-box">
        {isGhost ? <span className="ghost-emoji">👻</span> : <span className="user-initial">{initial}</span>}
      </div>
      <div className="info-box">
        <span className="name-text">{name}</span>
        <span className="type-label">{isGhost ? 'Invitado' : 'Registrado'}</span>
      </div>
    </div>
  );
};
