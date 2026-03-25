import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/contexts/UnitContext';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, CalendarDays, Utensils, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Ramp = Tables<'ramps'>;
type RampSlot = Tables<'ramp_slots'>;
type FoodItem = Tables<'food_items'>;
type Menu = Tables<'menus'>;
type MenuItem = Tables<'menu_items'>;

const SHIFTS = [
  { value: 'lunch', label: 'Almoço' },
  { value: 'dinner', label: 'Jantar' },
];

const FOOD_CATEGORIES: Record<string, string> = {
  protein: 'Proteína',
  carb: 'Carboidrato',
  salad: 'Salada',
  side: 'Acompanhamento',
  other: 'Outros',
};

export default function AdminMenu() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShift, setSelectedShift] = useState<'lunch' | 'dinner'>('lunch');
  const [selectedRamp, setSelectedRamp] = useState<string>('');
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});

  // Fetch ramps
  const { data: ramps } = useQuery({
    queryKey: ['admin-ramps', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit) return [];
      const { data, error } = await supabase.from('ramps').select('*').eq('unit_id', selectedUnit.id).eq('active', true).order('sort_order');
      if (error) throw error;
      return data as Ramp[];
    },
    enabled: !!selectedUnit,
  });

  // Fetch slots for selected ramp
  const { data: slots } = useQuery({
    queryKey: ['admin-ramp-slots', selectedRamp],
    queryFn: async () => {
      if (!selectedRamp) return [];
      const { data, error } = await supabase.from('ramp_slots').select('*').eq('ramp_id', selectedRamp).order('sort_order');
      if (error) throw error;
      return data as RampSlot[];
    },
    enabled: !!selectedRamp,
  });

  // Fetch food items
  const { data: foodItems } = useQuery({
    queryKey: ['admin-food-items', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit) return [];
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .or(`unit_id.is.null,unit_id.eq.${selectedUnit.id}`)
        .eq('active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return data as FoodItem[];
    },
    enabled: !!selectedUnit,
  });

  // Fetch existing menu
  const { data: existingMenu } = useQuery({
    queryKey: ['admin-menu', selectedUnit?.id, selectedDate, selectedShift],
    queryFn: async () => {
      if (!selectedUnit) return null;
      const { data, error } = await supabase
        .from('menus')
        .select('*, menu_items(*)')
        .eq('unit_id', selectedUnit.id)
        .eq('date', selectedDate)
        .eq('shift', selectedShift)
        .maybeSingle();
      if (error) throw error;
      return data as (Menu & { menu_items: MenuItem[] }) | null;
    },
    enabled: !!selectedUnit,
  });

  // Load existing assignments when menu/ramp changes
  useEffect(() => {
    if (existingMenu?.menu_items && selectedRamp) {
      const assignments: Record<string, string> = {};
      existingMenu.menu_items
        .filter(mi => mi.ramp_id === selectedRamp)
        .forEach(mi => {
          if (mi.food_item_id) {
            assignments[mi.slot_key] = mi.food_item_id;
          }
        });
      setSlotAssignments(assignments);
    } else {
      setSlotAssignments({});
    }
  }, [existingMenu, selectedRamp]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUnit || !selectedRamp || !slots) throw new Error('Dados incompletos');

      // Get or create menu
      let menuId = existingMenu?.id;
      if (!menuId) {
        const { data: newMenu, error: menuError } = await supabase
          .from('menus')
          .insert({ unit_id: selectedUnit.id, date: selectedDate, shift: selectedShift })
          .select()
          .single();
        if (menuError) throw menuError;
        menuId = newMenu.id;
      }

      // Delete existing menu items for this ramp
      if (existingMenu) {
        await supabase
          .from('menu_items')
          .delete()
          .eq('menu_id', menuId)
          .eq('ramp_id', selectedRamp);
      }

      // Insert new menu items
      const menuItems = slots
        .filter(slot => slotAssignments[slot.slot_key])
        .map((slot, index) => ({
          menu_id: menuId!,
          unit_id: selectedUnit.id,
          ramp_id: selectedRamp,
          slot_key: slot.slot_key,
          food_item_id: slotAssignments[slot.slot_key],
          display_name: foodItems?.find(f => f.id === slotAssignments[slot.slot_key])?.name || slot.label,
          sort_order: index,
        }));

      if (menuItems.length > 0) {
        const { error: itemsError } = await supabase.from('menu_items').insert(menuItems);
        if (itemsError) throw itemsError;
      }

      // Initialize current_status for menu items
      for (const item of menuItems) {
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select('id')
          .eq('menu_id', menuId!)
          .eq('slot_key', item.slot_key)
          .eq('ramp_id', selectedRamp)
          .single();

        if (menuItem) {
          await supabase.from('current_status').upsert({
            menu_item_id: menuItem.id,
            unit_id: selectedUnit.id,
            status: 'ok',
          }, { onConflict: 'menu_item_id' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
      toast.success('Cardápio salvo com sucesso!');
    },
    onError: (error) => toast.error('Erro ao salvar: ' + error.message),
  });

  const handleSlotChange = (slotKey: string, foodItemId: string) => {
    setSlotAssignments(prev => ({
      ...prev,
      [slotKey]: foodItemId === 'none' ? '' : foodItemId,
    }));
  };

  const getFoodItemsByCategory = (category: string) => {
    return foodItems?.filter(f => f.category === category) || [];
  };

  const getAssignedCount = () => {
    return Object.values(slotAssignments).filter(Boolean).length;
  };

  if (!selectedUnit) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-6 flex items-center justify-center">
          <p className="text-muted-foreground">Selecione uma unidade primeiro</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Montar Cardápio</h2>
            <p className="text-muted-foreground">Configure o cardápio do dia para {selectedUnit.name}</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass-card mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Selecionar Data, Turno e Rampa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={selectedShift} onValueChange={(v) => setSelectedShift(v as 'lunch' | 'dinner')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rampa</Label>
                <Select value={selectedRamp} onValueChange={setSelectedRamp}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma rampa" /></SelectTrigger>
                  <SelectContent>
                    {ramps?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slot Assignments */}
        {selectedRamp && slots && slots.length > 0 ? (
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Utensils className="w-5 h-5" />
                    Associar Alimentos aos Slots
                  </CardTitle>
                  <CardDescription>
                    {getAssignedCount()} de {slots.length} slots preenchidos
                  </CardDescription>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar Cardápio'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {slots.map(slot => (
                  <div key={slot.id} className="p-4 rounded-lg border border-border bg-card/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{slot.label}</span>
                      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        {FOOD_CATEGORIES[slot.category] || slot.category}
                      </span>
                    </div>
                    <Select
                      value={slotAssignments[slot.slot_key] || 'none'}
                      onValueChange={(v) => handleSlotChange(slot.slot_key, v)}
                    >
                      <SelectTrigger className={slotAssignments[slot.slot_key] ? 'border-green-500/50' : ''}>
                        <SelectValue placeholder="Selecione um alimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Nenhum --</SelectItem>
                        {/* Show items matching slot category first */}
                        {getFoodItemsByCategory(slot.category).length > 0 && (
                          <>
                            <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                              {FOOD_CATEGORIES[slot.category]}
                            </div>
                            {getFoodItemsByCategory(slot.category).map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                <div className="flex items-center gap-2">
                                  {slotAssignments[slot.slot_key] === f.id && <Check className="w-3 h-3 text-green-500" />}
                                  {f.name}
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {/* Show other items */}
                        {Object.keys(FOOD_CATEGORIES)
                          .filter(cat => cat !== slot.category && getFoodItemsByCategory(cat).length > 0)
                          .map(cat => (
                            <React.Fragment key={cat}>
                              <div className="px-2 py-1 text-xs text-muted-foreground font-medium mt-2">
                                {FOOD_CATEGORIES[cat]}
                              </div>
                              {getFoodItemsByCategory(cat).map(f => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </React.Fragment>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : selectedRamp ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum slot configurado para esta rampa. Configure os slots primeiro em Rampas.
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              Selecione uma rampa para configurar o cardápio
            </CardContent>
          </Card>
        )}

        {/* Quick Summary */}
        {existingMenu && (
          <Card className="glass-card mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cardápio Existente</CardTitle>
              <CardDescription>
                Criado em {format(new Date(existingMenu.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {' • '}{existingMenu.menu_items.length} itens no total
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
