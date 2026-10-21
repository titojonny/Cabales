import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusClass = `status-${(status || '').toLowerCase()}`;

  let label = status;
  switch (status) {
    case 'ACTIVO':
      label = 'Mesa Abierta';
      break;
    case 'CERRADO':
      label = 'Mesa Cerrada';
      break;
    case 'PENDIENTE':
      label = 'Pendiente';
      break;
    case 'EN_REVISION':
      label = 'En Revisión';
      break;
    case 'COMPLETADO':
      label = 'Completado';
      break;
    case 'EN_DISPUTA':
      label = 'En Disputa';
      break;
  }

  return (
    <span className={`status-pill ${statusClass}`}>
      <span className="dot-indicator" />
      {label}
    </span>
  );
};
