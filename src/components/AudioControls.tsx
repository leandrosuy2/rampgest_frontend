import React from 'react';
import { Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAudio } from '@/contexts/AudioContext';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';

export function AudioControls() {
  const { isMuted, volume, toggleMute, setVolume, playSound } = useAudio();
  const { permission, isSupported, requestPermission } = useNotifications();

  const handleTestSound = () => {
    playSound('attention');
    toast.info('Som de teste reproduzido!');
  };

  const handleNotificationToggle = async () => {
    if (permission === 'granted') {
      toast.info('Notificações já estão habilitadas');
    } else if (permission === 'denied') {
      toast.error('Notificações bloqueadas. Habilite nas configurações do navegador.');
    } else {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Notificações habilitadas!');
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Notification toggle */}
      {isSupported && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNotificationToggle}
          className={permission === 'granted' ? 'text-primary' : 'text-muted-foreground'}
          title={permission === 'granted' ? 'Notificações habilitadas' : 'Habilitar notificações'}
        >
          {permission === 'granted' ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
        </Button>
      )}

      {/* Volume controls */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={isMuted ? 'text-muted-foreground' : 'text-primary'}
            title={isMuted ? 'Som desligado' : 'Som ligado'}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Volume</span>
              <Button variant="outline" size="sm" onClick={toggleMute}>
                {isMuted ? 'Ligar' : 'Mudo'}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                max={100}
                step={5}
                className="flex-1"
                disabled={isMuted}
              />
              <Volume2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {volume}%
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full" 
              onClick={handleTestSound}
              disabled={isMuted}
            >
              Testar som
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
