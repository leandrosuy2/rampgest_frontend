import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { useCurrentMenu } from '@/hooks/useCurrentMenu';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { useSlaRules } from '@/hooks/useSlaRules';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusLegend } from '@/components/StatusLegend';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Check, AlertTriangle, X, Loader2, LogOut } from 'lucide-react';
import type { ItemStatus, MenuItemWithStatus, FoodCategory } from '@/types/database';

export default function ObserverRamp() {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const { rampId } = useParams<{ rampId: string }>();
  const navigate = useNavigate();
  const { selectedUnit } = useUnit();
  const { menu, isLoading: menuLoading } = useCurrentMenu(selectedUnit?.id || null);
  const { ramps, updateStatus, isLoading: statusLoading } = useRealtimeStatus({
    unitId: selectedUnit?.id || null,
    menuId: menu?.id || null
  });
  const { getSlaMinutes } = useSlaRules(selectedUnit?.id || null);

  const ramp = ramps.find(r => r.id === rampId);
  const items = ramp?.menu_items || [];
  const isLoading = menuLoading || statusLoading;

  const handleStatusChange = async (item: MenuItemWithStatus, newStatus: ItemStatus) => {
    const category = item.food_item?.category as FoodCategory | undefined;
    const slaMinutes = getSlaMinutes(category, item.slot_key);
    await updateStatus(item.id, newStatus, slaMinutes);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate('/observer')} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h2 className="text-2xl font-bold">{ramp?.name || 'Rampa'}</h2>
            <p className="text-muted-foreground">Marque o status de cada item</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowExitDialog(true)}
            className="gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline">Sair</span>
          </Button>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum item nesta rampa</p>
            </div>
          ) : (
            items.map((item) => {
              const status = item.current_status?.status || 'ok';
              const isOverdue = item.current_status?.deadline_at && 
                new Date(item.current_status.deadline_at) < new Date() &&
                !item.current_status.sla_acknowledged_at;

              return (
                <Card key={item.id} className={`ramp-card ramp-card-${status}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={status} isOverdue={isOverdue} />
                        <span className="font-medium">{item.display_name}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="lg"
                          className={`action-btn flex-1 sm:flex-none ${status === 'ok' ? 'bg-status-ok hover:bg-status-ok/80' : 'bg-secondary hover:bg-secondary/80'}`}
                          onClick={() => handleStatusChange(item, 'ok')}
                        >
                          <Check className="w-5 h-5 mr-1" />
                          OK
                        </Button>
                        <Button
                          size="lg"
                          className={`action-btn flex-1 sm:flex-none ${status === 'attention' ? 'bg-status-attention hover:bg-status-attention/80' : 'bg-secondary hover:bg-secondary/80'}`}
                          onClick={() => handleStatusChange(item, 'attention')}
                        >
                          <AlertTriangle className="w-5 h-5 mr-1" />
                          ATENÇÃO
                        </Button>
                        <Button
                          size="lg"
                          className={`action-btn flex-1 sm:flex-none ${status === 'missing' ? 'bg-status-missing hover:bg-status-missing/80' : 'bg-secondary hover:bg-secondary/80'}`}
                          onClick={() => handleStatusChange(item, 'missing')}
                        >
                          <X className="w-5 h-5 mr-1" />
                          FALTANDO
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <StatusLegend />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair do Observador?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será redirecionado para o menu principal do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/dashboard')}>
              Confirmar Saída
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
