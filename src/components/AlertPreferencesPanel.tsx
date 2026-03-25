import React from 'react';
import { Bell, BellOff, Volume2, VolumeX, RotateCcw, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAlertPreferences, AlertType } from '@/hooks/useAlertPreferences';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AlertTypeConfig {
  type: AlertType;
  label: string;
  description: string;
  color: string;
}

const alertTypes: AlertTypeConfig[] = [
  {
    type: 'missing',
    label: 'Faltando',
    description: 'Item precisa ser reposto imediatamente',
    color: 'bg-red-500',
  },
  {
    type: 'attention',
    label: 'Atenção',
    description: 'Item está acabando e precisa de atenção',
    color: 'bg-yellow-500',
  },
  {
    type: 'overdue',
    label: 'SLA Excedido',
    description: 'Item ultrapassou o tempo máximo de reposição',
    color: 'bg-red-700',
  },
  {
    type: 'preparing',
    label: 'Em Preparo',
    description: 'Item está sendo preparado na cozinha',
    color: 'bg-blue-500',
  },
  {
    type: 'replenished',
    label: 'Reposto',
    description: 'Item foi reabastecido com sucesso',
    color: 'bg-green-500',
  },
];

export function AlertPreferencesPanel() {
  const { user } = useAuth();
  const {
    preferences,
    isSyncing,
    toggleSound,
    toggleNotification,
    resetToDefaults,
  } = useAlertPreferences();

  const handleReset = () => {
    resetToDefaults();
    toast.success('Preferências restauradas para o padrão');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Preferências de Alertas
              {isSyncing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              {user ? (
                <>
                  <Cloud className="w-3 h-3" />
                  Sincronizado entre dispositivos
                </>
              ) : (
                <>
                  <CloudOff className="w-3 h-3" />
                  Salvo localmente (faça login para sincronizar)
                </>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header row */}
        <div className="grid grid-cols-[1fr,80px,80px] gap-4 items-center px-2">
          <div className="text-sm font-medium text-muted-foreground">Tipo de Alerta</div>
          <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            Som
          </div>
          <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
            <Bell className="w-4 h-4" />
            Push
          </div>
        </div>

        <Separator />

        {/* Alert type rows */}
        {alertTypes.map((alertConfig) => (
          <div
            key={alertConfig.type}
            className="grid grid-cols-[1fr,80px,80px] gap-4 items-center px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${alertConfig.color}`} />
              <div>
                <Label className="font-medium cursor-pointer">
                  {alertConfig.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {alertConfig.description}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Switch
                checked={preferences.sound[alertConfig.type]}
                onCheckedChange={() => toggleSound(alertConfig.type)}
                aria-label={`Som para ${alertConfig.label}`}
              />
            </div>

            <div className="flex justify-center">
              <Switch
                checked={preferences.notification[alertConfig.type]}
                onCheckedChange={() => toggleNotification(alertConfig.type)}
                aria-label={`Notificação para ${alertConfig.label}`}
              />
            </div>
          </div>
        ))}

        <Separator />

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              alertTypes.forEach(a => {
                if (!preferences.sound[a.type]) toggleSound(a.type);
              });
            }}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Todos os sons
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              alertTypes.forEach(a => {
                if (preferences.sound[a.type]) toggleSound(a.type);
              });
            }}
          >
            <VolumeX className="w-4 h-4 mr-2" />
            Nenhum som
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              alertTypes.forEach(a => {
                if (!preferences.notification[a.type]) toggleNotification(a.type);
              });
            }}
          >
            <Bell className="w-4 h-4 mr-2" />
            Todas notificações
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              alertTypes.forEach(a => {
                if (preferences.notification[a.type]) toggleNotification(a.type);
              });
            }}
          >
            <BellOff className="w-4 h-4 mr-2" />
            Nenhuma notificação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
