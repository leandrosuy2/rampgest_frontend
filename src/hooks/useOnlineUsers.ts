import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUnit } from '@/contexts/UnitContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface OnlineUser {
  oderId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  page: string;
  lastSeen: string;
}

interface PresenceState {
  [key: string]: OnlineUser[];
}

export function useOnlineUsers() {
  const { user } = useAuth();
  const { selectedUnit } = useUnit();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const getCurrentPage = useCallback(() => {
    const path = window.location.pathname;
    if (path.includes('/monitor')) return 'Monitor';
    if (path.includes('/observer')) return 'Observador';
    if (path.includes('/admin')) return 'Admin';
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/profile')) return 'Perfil';
    return 'Início';
  }, []);

  useEffect(() => {
    if (!user || !selectedUnit?.id) return;

    const channelName = `presence:unit:${selectedUnit.id}`;
    
    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as PresenceState;
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            // Don't include current user
            if (presence.oderId !== user.id) {
              users.push(presence);
            }
          });
        });

        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            oderId: user.id,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            avatarUrl: user.user_metadata?.avatar_url,
            page: getCurrentPage(),
            lastSeen: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [user, selectedUnit?.id, getCurrentPage]);

  // Update presence when page changes
  useEffect(() => {
    if (!channel || !user) return;

    const updatePresence = async () => {
      await channel.track({
        oderId: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        avatarUrl: user.user_metadata?.avatar_url,
        page: getCurrentPage(),
        lastSeen: new Date().toISOString(),
      });
    };

    updatePresence();
  }, [channel, user, getCurrentPage]);

  // Update last seen periodically
  useEffect(() => {
    if (!channel || !user) return;

    const interval = setInterval(async () => {
      await channel.track({
        oderId: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        avatarUrl: user.user_metadata?.avatar_url,
        page: getCurrentPage(),
        lastSeen: new Date().toISOString(),
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [channel, user, getCurrentPage]);

  return {
    onlineUsers,
    totalOnline: onlineUsers.length + 1, // +1 for current user
  };
}
