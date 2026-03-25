import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/contexts/UnitContext';
import { Navigate } from 'react-router-dom';
import Login from './Login';
import UnitSelection from './UnitSelection';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, isLoading: authLoading } = useAuth();
  const { units, selectedUnit, isLoading: unitLoading } = useUnit();

  if (authLoading || unitLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Login />;
  }

  // Logged in but no units
  if (units.length === 0) {
    return <Dashboard />;
  }

  // Multiple units, none selected
  if (units.length > 1 && !selectedUnit) {
    return <UnitSelection />;
  }

  // Has unit selected or only one unit
  return <Dashboard />;
}
