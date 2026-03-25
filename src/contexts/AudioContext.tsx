import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';

type SoundType = 'missing' | 'attention' | 'replenished' | 'overdue' | 'preparing';

interface AudioContextType {
  isMuted: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  playSound: (type: SoundType) => void;
  acknowledgeOverdue: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Create audio oscillator sounds
function createBeep(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.5
): void {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(70);
  const audioContextRef = useRef<AudioContext | null>(null);
  const overdueIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayedRef = useRef<{ [key: string]: number }>({});

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return;

    // Debounce: prevent same sound within 2 seconds
    const now = Date.now();
    if (lastPlayedRef.current[type] && now - lastPlayedRef.current[type] < 2000) {
      return;
    }
    lastPlayedRef.current[type] = now;

    const audioContext = getAudioContext();
    const vol = volume / 100;

    switch (type) {
      case 'missing':
        // Strong beep - high frequency, square wave
        createBeep(audioContext, 880, 0.3, 'square', vol * 0.8);
        setTimeout(() => createBeep(audioContext, 880, 0.3, 'square', vol * 0.8), 350);
        break;
      case 'attention':
        // Gentle beep - medium frequency, sine wave
        createBeep(audioContext, 660, 0.2, 'sine', vol * 0.6);
        break;
      case 'replenished':
        // Confirmation sound - ascending tones
        createBeep(audioContext, 523, 0.1, 'sine', vol * 0.5);
        setTimeout(() => createBeep(audioContext, 659, 0.1, 'sine', vol * 0.5), 100);
        setTimeout(() => createBeep(audioContext, 784, 0.15, 'sine', vol * 0.5), 200);
        break;
      case 'preparing':
        // Short notification
        createBeep(audioContext, 440, 0.15, 'triangle', vol * 0.4);
        break;
      case 'overdue':
        // Alarm - rapid repeating beeps
        if (overdueIntervalRef.current) {
          clearInterval(overdueIntervalRef.current);
        }
        const playAlarm = () => {
          createBeep(audioContext, 1000, 0.1, 'square', vol);
          setTimeout(() => createBeep(audioContext, 800, 0.1, 'square', vol), 150);
        };
        playAlarm();
        overdueIntervalRef.current = setInterval(playAlarm, 1000);
        break;
    }
  }, [isMuted, volume, getAudioContext]);

  const acknowledgeOverdue = useCallback(() => {
    if (overdueIntervalRef.current) {
      clearInterval(overdueIntervalRef.current);
      overdueIntervalRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (!isMuted && overdueIntervalRef.current) {
      clearInterval(overdueIntervalRef.current);
      overdueIntervalRef.current = null;
    }
  }, [isMuted]);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(100, newVolume)));
  }, []);

  return (
    <AudioContext.Provider value={{
      isMuted,
      volume,
      toggleMute,
      setVolume,
      playSound,
      acknowledgeOverdue
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
