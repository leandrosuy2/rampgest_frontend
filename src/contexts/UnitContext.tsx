import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Unit, UserUnit, AppRole } from '@/types/database';

interface UnitContextType {
  units: Unit[];
  userUnits: UserUnit[];
  selectedUnit: Unit | null;
  userRole: AppRole | null;
  isLoading: boolean;
  selectUnit: (unit: Unit) => void;
  refreshUnits: () => Promise<void>;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [userUnits, setUserUnits] = useState<UserUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setUnits([]);
        setUserUnits([]);
        setSelectedUnit(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      const { data: userUnitsData, error: userUnitsError } = await supabase
        .from('user_units')
        .select(`
          *,
          unit:units(*)
        `)
        .eq('user_id', session.session.user.id);

      if (userUnitsError) throw userUnitsError;

      const mappedUserUnits = (userUnitsData || []).map(uu => ({
        ...uu,
        role: uu.role as AppRole,
        unit: uu.unit as Unit
      }));

      setUserUnits(mappedUserUnits);
      setUnits(mappedUserUnits.map(uu => uu.unit).filter(Boolean) as Unit[]);

      // Auto-select if only one unit
      if (mappedUserUnits.length === 1 && mappedUserUnits[0].unit) {
        setSelectedUnit(mappedUserUnits[0].unit);
        setUserRole(mappedUserUnits[0].role);
      } else {
        // Try to restore from localStorage
        const savedUnitId = localStorage.getItem('selectedUnitId');
        if (savedUnitId) {
          const found = mappedUserUnits.find(uu => uu.unit_id === savedUnitId);
          if (found && found.unit) {
            setSelectedUnit(found.unit);
            setUserRole(found.role);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    localStorage.setItem('selectedUnitId', unit.id);
    const userUnit = userUnits.find(uu => uu.unit_id === unit.id);
    setUserRole(userUnit?.role || null);
  };

  const refreshUnits = async () => {
    setIsLoading(true);
    await fetchUnits();
  };

  useEffect(() => {
    fetchUnits();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUnits();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <UnitContext.Provider value={{
      units,
      userUnits,
      selectedUnit,
      userRole,
      isLoading,
      selectUnit,
      refreshUnits
    }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}
