import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Menu, ShiftType } from '@/types/database';

export function useCurrentMenu(unitId: string | null) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!unitId) {
      setMenu(null);
      setIsLoading(false);
      return;
    }

    const fetchMenu = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const hour = new Date().getHours();
        const shift: ShiftType = hour < 15 ? 'lunch' : 'dinner';

        // Try to find today's menu for current shift
        let { data, error } = await supabase
          .from('menus')
          .select('*')
          .eq('unit_id', unitId)
          .eq('date', today)
          .eq('shift', shift)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "no rows returned"
          throw error;
        }

        // If no menu for specific shift, try 'both'
        if (!data) {
          const { data: bothData, error: bothError } = await supabase
            .from('menus')
            .select('*')
            .eq('unit_id', unitId)
            .eq('date', today)
            .eq('shift', 'both')
            .single();

          if (bothError && bothError.code !== 'PGRST116') {
            throw bothError;
          }
          data = bothData;
        }

        // If still no menu, get latest menu for the unit
        if (!data) {
          const { data: latestData, error: latestError } = await supabase
            .from('menus')
            .select('*')
            .eq('unit_id', unitId)
            .order('date', { ascending: false })
            .limit(1)
            .single();

          if (latestError && latestError.code !== 'PGRST116') {
            throw latestError;
          }
          data = latestData;
        }

        setMenu(data as Menu | null);
      } catch (error) {
        console.error('Error fetching menu:', error);
        setMenu(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [unitId]);

  return { menu, isLoading };
}
