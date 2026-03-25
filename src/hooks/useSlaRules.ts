import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SlaRule, FoodCategory } from '@/types/database';

export function useSlaRules(unitId: string | null) {
  const [rules, setRules] = useState<SlaRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!unitId) {
      setRules([]);
      setIsLoading(false);
      return;
    }

    const fetchRules = async () => {
      try {
        const { data, error } = await supabase
          .from('sla_rules')
          .select('*')
          .eq('unit_id', unitId)
          .eq('active', true);

        if (error) throw error;
        setRules(data as SlaRule[] || []);
      } catch (error) {
        console.error('Error fetching SLA rules:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRules();
  }, [unitId]);

  const getSlaMinutes = useCallback((category?: FoodCategory, slotKey?: string): number => {
    // Priority: slot_key > category > default
    if (slotKey) {
      const slotRule = rules.find(r => r.applies_to === 'slot_key' && r.key === slotKey);
      if (slotRule) return slotRule.sla_minutes_missing;
    }

    if (category) {
      const categoryRule = rules.find(r => r.applies_to === 'category' && r.key === category);
      if (categoryRule) return categoryRule.sla_minutes_missing;
    }

    const defaultRule = rules.find(r => r.applies_to === 'default');
    return defaultRule?.sla_minutes_missing || 5; // Default 5 minutes
  }, [rules]);

  return { rules, isLoading, getSlaMinutes };
}
