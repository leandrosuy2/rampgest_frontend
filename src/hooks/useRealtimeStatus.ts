import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CurrentStatus, MenuItem, ItemStatus, MenuItemWithStatus, RampWithItems, Ramp } from '@/types/database';
import { useAudio } from '@/contexts/AudioContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useAlertPreferences, AlertType } from '@/hooks/useAlertPreferences';
import { useNotificationContext } from '@/contexts/NotificationContext';

interface UseRealtimeStatusProps {
  unitId: string | null;
  menuId: string | null;
}

export function useRealtimeStatus({ unitId, menuId }: UseRealtimeStatusProps) {
  const [menuItems, setMenuItems] = useState<MenuItemWithStatus[]>([]);
  const [ramps, setRamps] = useState<RampWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playSound } = useAudio();
  const { sendNotification } = useNotifications();
  const { shouldPlaySound, shouldSendNotification } = useAlertPreferences();
  const { addNotification } = useNotificationContext();

  const fetchData = useCallback(async () => {
    if (!unitId || !menuId) {
      setMenuItems([]);
      setRamps([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch ramps
      const { data: rampsData, error: rampsError } = await supabase
        .from('ramps')
        .select('*')
        .eq('unit_id', unitId)
        .eq('active', true)
        .order('sort_order');

      if (rampsError) throw rampsError;

      // Fetch menu items with current status
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          ramp:ramps(*),
          food_item:food_items(*)
        `)
        .eq('menu_id', menuId)
        .order('sort_order');

      if (itemsError) throw itemsError;

      // Fetch current status for all menu items
      const { data: statusData, error: statusError } = await supabase
        .from('current_status')
        .select('*')
        .eq('unit_id', unitId);

      if (statusError) throw statusError;

      // Map status to menu items
      const statusMap = new Map(statusData?.map(s => [s.menu_item_id, s]) || []);
      const mappedItems: MenuItemWithStatus[] = (itemsData || []).map(item => ({
        ...item,
        current_status: statusMap.get(item.id) as CurrentStatus | undefined
      }));

      setMenuItems(mappedItems);

      // Group items by ramp
      const rampsWithItems: RampWithItems[] = (rampsData || []).map(ramp => {
        const items = mappedItems.filter(item => item.ramp_id === ramp.id);
        const statusSummary = {
          ok: items.filter(i => !i.current_status || i.current_status.status === 'ok').length,
          attention: items.filter(i => i.current_status?.status === 'attention').length,
          missing: items.filter(i => i.current_status?.status === 'missing').length,
          preparing: items.filter(i => i.current_status?.status === 'preparing').length,
        };
        return {
          ...ramp,
          menu_items: items,
          statusSummary
        };
      });

      setRamps(rampsWithItems);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [unitId, menuId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!unitId) return;

    fetchData();

    const channel = supabase
      .channel(`status-${unitId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'current_status',
          filter: `unit_id=eq.${unitId}`
        },
        (payload) => {
          console.log('Status change:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newStatus = payload.new as CurrentStatus;
            const oldPayload = payload.old as CurrentStatus | null;
            
            // Find the item to get its name for notifications
            const item = menuItems.find(i => i.id === newStatus.menu_item_id);
            const itemName = item?.display_name || 'Item';
            
            // Play sound and send notification based on status change and preferences
            if (newStatus.status === 'missing') {
              // Check if overdue
              if (newStatus.deadline_at && new Date(newStatus.deadline_at) < new Date() && !newStatus.sla_acknowledged_at) {
                if (shouldPlaySound('overdue')) playSound('overdue');
                // Add to notification history
                addNotification({
                  type: 'overdue',
                  title: 'SLA Excedido',
                  body: `${itemName} está faltando há muito tempo`,
                  itemId: newStatus.menu_item_id,
                });
                if (shouldSendNotification('overdue')) {
                  sendNotification('⚠️ SLA Excedido!', {
                    body: `${itemName} está faltando há muito tempo`,
                    tag: `overdue-${newStatus.menu_item_id}`,
                  });
                }
              } else {
                if (shouldPlaySound('missing')) playSound('missing');
                // Add to notification history
                addNotification({
                  type: 'missing',
                  title: 'Item Faltando',
                  body: `${itemName} precisa ser reposto`,
                  itemId: newStatus.menu_item_id,
                });
                if (shouldSendNotification('missing')) {
                  sendNotification('🔴 Item Faltando', {
                    body: `${itemName} precisa ser reposto`,
                    tag: `missing-${newStatus.menu_item_id}`,
                  });
                }
              }
            } else if (newStatus.status === 'attention') {
              if (shouldPlaySound('attention')) playSound('attention');
              // Add to notification history
              addNotification({
                type: 'attention',
                title: 'Atenção Necessária',
                body: `${itemName} precisa de atenção`,
                itemId: newStatus.menu_item_id,
              });
              if (shouldSendNotification('attention')) {
                sendNotification('🟡 Atenção Necessária', {
                  body: `${itemName} precisa de atenção`,
                  tag: `attention-${newStatus.menu_item_id}`,
                });
              }
            } else if (newStatus.status === 'preparing') {
              if (shouldPlaySound('preparing')) playSound('preparing');
              // Add to notification history
              addNotification({
                type: 'preparing',
                title: 'Em Preparo',
                body: `${itemName} está sendo preparado`,
                itemId: newStatus.menu_item_id,
              });
              if (shouldSendNotification('preparing')) {
                sendNotification('🔵 Em Preparo', {
                  body: `${itemName} está sendo preparado`,
                  tag: `preparing-${newStatus.menu_item_id}`,
                });
              }
            } else if (newStatus.status === 'ok' && oldPayload?.status === 'missing') {
              if (shouldPlaySound('replenished')) playSound('replenished');
              // Add to notification history
              addNotification({
                type: 'replenished',
                title: 'Item Reposto',
                body: `${itemName} foi reabastecido`,
                itemId: newStatus.menu_item_id,
              });
              if (shouldSendNotification('replenished')) {
                sendNotification('✅ Item Reposto', {
                  body: `${itemName} foi reabastecido`,
                  tag: `replenished-${newStatus.menu_item_id}`,
                });
              }
            }

            // Update local state
            setMenuItems(prev => prev.map(item => 
              item.id === newStatus.menu_item_id 
                ? { ...item, current_status: newStatus }
                : item
            ));

            // Update ramps
            setRamps(prev => prev.map(ramp => {
              const items = ramp.menu_items.map(item =>
                item.id === newStatus.menu_item_id
                  ? { ...item, current_status: newStatus }
                  : item
              );
              const statusSummary = {
                ok: items.filter(i => !i.current_status || i.current_status.status === 'ok').length,
                attention: items.filter(i => i.current_status?.status === 'attention').length,
                missing: items.filter(i => i.current_status?.status === 'missing').length,
                preparing: items.filter(i => i.current_status?.status === 'preparing').length,
              };
              return { ...ramp, menu_items: items, statusSummary };
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitId, menuId, fetchData, playSound, sendNotification, menuItems, shouldPlaySound, shouldSendNotification, addNotification]);

  const updateStatus = async (
    menuItemId: string,
    newStatus: ItemStatus,
    slaMinutes?: number
  ) => {
    if (!unitId) return;

    const now = new Date().toISOString();
    const currentItem = menuItems.find(i => i.id === menuItemId);
    const oldStatus = currentItem?.current_status?.status || 'ok';

    const updateData: Partial<CurrentStatus> = {
      status: newStatus,
      updated_at: now,
    };

    // Set alert timing for missing status
    if (newStatus === 'missing' && oldStatus !== 'missing') {
      updateData.alert_started_at = now;
      updateData.deadline_at = slaMinutes 
        ? new Date(Date.now() + slaMinutes * 60 * 1000).toISOString()
        : null;
      updateData.sla_met = null;
      updateData.overdue_seconds = 0;
      updateData.resolved_at = null;
      updateData.sla_acknowledged_at = null;
    }

    // Handle resolution
    if ((newStatus === 'ok' || newStatus === 'preparing') && oldStatus === 'missing') {
      updateData.resolved_at = now;
      
      // Calculate SLA metrics
      if (currentItem?.current_status?.alert_started_at) {
        const alertStart = new Date(currentItem.current_status.alert_started_at).getTime();
        const resolveTime = Date.now();
        const deadline = currentItem.current_status.deadline_at 
          ? new Date(currentItem.current_status.deadline_at).getTime()
          : null;

        updateData.sla_met = deadline ? resolveTime <= deadline : null;
        updateData.overdue_seconds = deadline && resolveTime > deadline
          ? Math.floor((resolveTime - deadline) / 1000)
          : 0;
      }
    }

    // Check if status record exists
    const { data: existingStatus } = await supabase
      .from('current_status')
      .select('menu_item_id')
      .eq('menu_item_id', menuItemId)
      .single();

    if (existingStatus) {
      const { error } = await supabase
        .from('current_status')
        .update(updateData)
        .eq('menu_item_id', menuItemId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('current_status')
        .insert({
          menu_item_id: menuItemId,
          unit_id: unitId,
          ...updateData
        });

      if (error) throw error;
    }

    // Log the event
    await supabase
      .from('status_events')
      .insert({
        unit_id: unitId,
        menu_item_id: menuItemId,
        ramp_id: currentItem?.ramp_id,
        slot_key: currentItem?.slot_key || '',
        from_status: oldStatus,
        to_status: newStatus,
        event_type: newStatus === 'ok' && oldStatus === 'missing' ? 'resolved' : 'status_change'
      });
  };

  const acknowledgeSla = async (menuItemId: string) => {
    if (!unitId) return;

    const { error } = await supabase
      .from('current_status')
      .update({
        sla_acknowledged_at: new Date().toISOString()
      })
      .eq('menu_item_id', menuItemId);

    if (error) throw error;

    // Log the event
    const currentItem = menuItems.find(i => i.id === menuItemId);
    await supabase
      .from('status_events')
      .insert({
        unit_id: unitId,
        menu_item_id: menuItemId,
        ramp_id: currentItem?.ramp_id,
        slot_key: currentItem?.slot_key || '',
        from_status: 'missing',
        to_status: 'missing',
        event_type: 'acknowledge'
      });
  };

  return {
    menuItems,
    ramps,
    isLoading,
    updateStatus,
    acknowledgeSla,
    refetch: fetchData
  };
}
