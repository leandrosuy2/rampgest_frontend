import React from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPromptProps {
  onClose?: () => void;
}

export function NotificationPrompt({ onClose }: NotificationPromptProps) {
  const { permission, isSupported, requestPermission } = useNotifications();

  if (!isSupported || permission === 'granted') {
    return null;
  }

  if (permission === 'denied') {
    return (
      <Card className="glass-card border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium">Notificações bloqueadas</p>
              <p className="text-xs text-muted-foreground">
                Habilite as notificações nas configurações do navegador para receber alertas
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleEnable = async () => {
    await requestPermission();
  };

  return (
    <Card className="glass-card border-primary/50 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Habilitar notificações</p>
            <p className="text-xs text-muted-foreground">
              Receba alertas quando itens mudarem de status
            </p>
          </div>
          <Button size="sm" onClick={handleEnable}>
            Habilitar
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
