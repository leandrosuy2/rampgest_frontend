import React from 'react';

export function StatusLegend() {
  return (
    <div className="legend-bar">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-full bg-status-ok" />
        <span className="text-sm">OK</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-full bg-status-attention" />
        <span className="text-sm">ATENÇÃO</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-full bg-status-missing" />
        <span className="text-sm">FALTANDO</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-full bg-status-overdue animate-pulse" />
        <span className="text-sm">REPOSIÇÃO IMEDIATA</span>
      </div>
    </div>
  );
}
