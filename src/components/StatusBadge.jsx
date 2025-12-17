import React from 'react';
import { STATUSES } from '../config.jsx';

const StatusBadge = ({ status }) => {
  const config = STATUSES[status.toUpperCase()] || STATUSES.AVAILABLE;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;