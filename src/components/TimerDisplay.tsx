import React, { useState, useEffect } from 'react';
import { formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimerDisplayProps {
  startTime: string | null;
  deadline?: string | null;
  isResolved?: boolean;
  className?: string;
}

export function TimerDisplay({ startTime, deadline, isResolved = false, className = '' }: TimerDisplayProps) {
  const [elapsed, setElapsed] = useState('00:00');
  const [isOverdue, setIsOverdue] = useState(false);
  const [overdueTime, setOverdueTime] = useState('');

  useEffect(() => {
    if (!startTime || isResolved) return;

    const updateTimer = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = now - start;

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

      if (deadline) {
        const deadlineTime = new Date(deadline).getTime();
        if (now > deadlineTime) {
          setIsOverdue(true);
          const overdueDiff = now - deadlineTime;
          const overMin = Math.floor(overdueDiff / 60000);
          const overSec = Math.floor((overdueDiff % 60000) / 1000);
          setOverdueTime(`+${String(overMin).padStart(2, '0')}:${String(overSec).padStart(2, '0')}`);
        } else {
          setIsOverdue(false);
          setOverdueTime('');
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, deadline, isResolved]);

  if (!startTime) return null;

  return (
    <div className={`font-mono-display ${className}`}>
      <span className={isOverdue ? 'text-status-overdue' : 'text-foreground'}>
        {elapsed}
      </span>
      {isOverdue && overdueTime && (
        <span className="ml-2 text-status-overdue font-bold animate-pulse">
          {overdueTime}
        </span>
      )}
    </div>
  );
}
