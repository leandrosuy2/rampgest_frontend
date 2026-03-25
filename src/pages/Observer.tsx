import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { useCurrentMenu } from '@/hooks/useCurrentMenu';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { useSlaRules } from '@/hooks/useSlaRules';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusLegend } from '@/components/StatusLegend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ChevronRight, Loader2, LogOut } from 'lucide-react';
import type { ItemStatus, RampWithItems } from '@/types/database';

function getRampOverallStatus(ramp: RampWithItems): ItemStatus {
  if (ramp.statusSummary.missing > 0) return 'missing';
  if (ramp.statusSummary.attention > 0) return 'attention';
  if (ramp.statusSummary.preparing > 0) return 'preparing';
  return 'ok';
}

export default function Observer() {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const navigate = useNavigate();
  const { selectedUnit } = useUnit();
  const { menu, isLoading: menuLoading } = useCurrentMenu(selectedUnit?.id || null);
  const { ramps, isLoading: statusLoading, updateStatus } = useRealtimeStatus({
    unitId: selectedUnit?.id || null,
    menuId: menu?.id || null
  });
  const { getSlaMinutes } = useSlaRules(selectedUnit?.id || null);

  const isLoading = menuLoading || statusLoading;

  const handleStatusChange = async (menuItemId: string, newStatus: ItemStatus, category?: string) => {
    const slaMinutes = getSlaMinutes(category as any);
    await updateStatus(menuItemId, newStatus, slaMinutes);
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
            <h2 className="text-2xl font-bold">Observador</h2>
            <p className="text-muted-foreground">Marque o status dos itens em cada rampa</p>
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

        {ramps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma rampa configurada ou cardápio ativo</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ramps.map((ramp) => {
              const overallStatus = getRampOverallStatus(ramp);
              return (
                <Card
                  key={ramp.id}
                  className={`ramp-card ramp-card-${overallStatus} cursor-pointer`}
                  onClick={() => navigate(`/observer/${ramp.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{ramp.name}</CardTitle>
                      <StatusBadge status={overallStatus} size="sm" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex gap-3">
                        <span className="text-status-ok">{ramp.statusSummary.ok} OK</span>
                        <span className="text-status-attention">{ramp.statusSummary.attention} Atenção</span>
                        <span className="text-status-missing">{ramp.statusSummary.missing} Faltando</span>
                      </div>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
