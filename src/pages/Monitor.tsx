import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { useAudio } from '@/contexts/AudioContext';
import { useCurrentMenu } from '@/hooks/useCurrentMenu';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { StatusBadge } from '@/components/StatusBadge';
import { TimerDisplay } from '@/components/TimerDisplay';
import { StatusLegend } from '@/components/StatusLegend';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX, 
  Check,
  Clock,
  AlertTriangle,
  ChefHat,
  Loader2,
  LogOut
} from 'lucide-react';
import type { ItemStatus, MenuItemWithStatus } from '@/types/database';

export default function Monitor() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const navigate = useNavigate();
  const { selectedUnit } = useUnit();
  const { menu, isLoading: menuLoading } = useCurrentMenu(selectedUnit?.id || null);
  const { ramps, updateStatus, acknowledgeSla, isLoading: statusLoading } = useRealtimeStatus({
    unitId: selectedUnit?.id || null,
    menuId: menu?.id || null
  });
  const { isMuted, volume, toggleMute, setVolume, acknowledgeOverdue } = useAudio();

  const isLoading = menuLoading || statusLoading;

  // Get all missing/attention items
  const alertItems = ramps.flatMap(ramp => 
    ramp.menu_items
      .filter(item => item.current_status?.status === 'missing' || item.current_status?.status === 'attention')
      .map(item => ({ ...item, rampName: ramp.name, rampCode: ramp.code }))
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleReplenish = async (item: MenuItemWithStatus) => {
    await updateStatus(item.id, 'ok');
  };

  const handlePreparing = async (item: MenuItemWithStatus) => {
    await updateStatus(item.id, 'preparing');
  };

  const handleAcknowledgeSla = async (item: MenuItemWithStatus) => {
    await acknowledgeSla(item.id);
    acknowledgeOverdue();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isFullscreen ? 'monitor-fullscreen' : ''}`}>
      {/* Header */}
      <header className="industrial-header py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ChefHat className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                CONTROLE DE REPOSIÇÃO – RAMPAS
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedUnit?.name} • {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Volume */}
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                max={100}
                className="w-24"
                disabled={isMuted}
              />
            </div>

            {/* Fullscreen */}
            <Button variant="outline" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>

            {/* Exit to Menu */}
            <Button 
              variant="outline" 
              onClick={() => setShowExitDialog(true)}
              className="gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair do Monitor?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será redirecionado para o menu principal do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/dashboard')}>
              Confirmar Saída
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {alertItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-status-ok/20 flex items-center justify-center mb-4">
              <Check className="w-12 h-12 text-status-ok" />
            </div>
            <h2 className="text-3xl font-bold text-status-ok">TUDO OK!</h2>
            <p className="text-muted-foreground mt-2">Todos os itens estão abastecidos</p>
          </div>
        ) : (
          <div className="monitor-grid">
            {alertItems.map((item) => {
              const status = item.current_status?.status || 'ok';
              const isOverdue = item.current_status?.deadline_at && 
                new Date(item.current_status.deadline_at) < new Date() &&
                !item.current_status.sla_acknowledged_at;
              const isAcknowledged = item.current_status?.sla_acknowledged_at;

              return (
                <div
                  key={item.id}
                  className={`
                    p-6 rounded-xl border-2 transition-all
                    ${isOverdue && !isAcknowledged ? 'pulse-overdue border-status-overdue bg-status-overdue/10' : ''}
                    ${status === 'missing' && !isOverdue ? 'border-status-missing bg-status-missing/10 pulse-alert' : ''}
                    ${status === 'attention' ? 'border-status-attention bg-status-attention/10' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {item.rampName}
                      </span>
                      <h3 className="text-xl font-bold">{item.display_name}</h3>
                    </div>
                    <StatusBadge status={status} isOverdue={isOverdue && !isAcknowledged} size="lg" />
                  </div>

                  {/* Timer */}
                  {status === 'missing' && item.current_status?.alert_started_at && (
                    <div className="mb-4 p-3 rounded-lg bg-background/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span>Tempo de Alerta</span>
                      </div>
                      <TimerDisplay
                        startTime={item.current_status.alert_started_at}
                        deadline={item.current_status.deadline_at}
                        className="text-3xl"
                      />
                      {isOverdue && !isAcknowledged && (
                        <div className="flex items-center gap-2 mt-2 text-status-overdue font-bold">
                          <AlertTriangle className="w-5 h-5" />
                          SLA ESTOURADO
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {isOverdue && !isAcknowledged && (
                      <Button
                        variant="outline"
                        className="flex-1 border-status-overdue text-status-overdue hover:bg-status-overdue/10"
                        onClick={() => handleAcknowledgeSla(item)}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        RECONHECER
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 border-status-preparing text-status-preparing hover:bg-status-preparing/10"
                      onClick={() => handlePreparing(item)}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      EM PREPARO
                    </Button>
                    <Button
                      className="flex-1 bg-status-ok hover:bg-status-ok/80 text-status-ok-foreground"
                      onClick={() => handleReplenish(item)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      REPOSTO
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <StatusLegend />
    </div>
  );
}
