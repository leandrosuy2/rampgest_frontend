import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/contexts/UnitContext';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, ArrowLeft, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Ramp = Tables<'ramps'>;
type RampSlot = Tables<'ramp_slots'>;

const FOOD_CATEGORIES = [
  { value: 'protein', label: 'Proteína' },
  { value: 'carb', label: 'Carboidrato' },
  { value: 'salad', label: 'Salada' },
  { value: 'side', label: 'Acompanhamento' },
  { value: 'other', label: 'Outros' },
];

export default function AdminRamps() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingRamp, setEditingRamp] = useState<Ramp | null>(null);
  const [selectedRamp, setSelectedRamp] = useState<Ramp | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', type: 'standard', active: true, sort_order: 0 });
  const [slotForm, setSlotForm] = useState({ label: '', slot_key: '', category: 'other' as string, sort_order: 0 });
  const [editingSlot, setEditingSlot] = useState<RampSlot | null>(null);

  const { data: ramps, isLoading } = useQuery({
    queryKey: ['admin-ramps', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit) return [];
      const { data, error } = await supabase.from('ramps').select('*').eq('unit_id', selectedUnit.id).order('sort_order');
      if (error) throw error;
      return data as Ramp[];
    },
    enabled: !!selectedUnit,
  });

  const { data: slots } = useQuery({
    queryKey: ['admin-ramp-slots', selectedRamp?.id],
    queryFn: async () => {
      if (!selectedRamp) return [];
      const { data, error } = await supabase.from('ramp_slots').select('*').eq('ramp_id', selectedRamp.id).order('sort_order');
      if (error) throw error;
      return data as RampSlot[];
    },
    enabled: !!selectedRamp,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('ramps').update({ name: data.name, code: data.code, type: data.type, active: data.active, sort_order: data.sort_order }).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ramps').insert({ name: data.name, code: data.code, type: data.type, active: data.active, sort_order: data.sort_order, unit_id: selectedUnit!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramps'] });
      toast.success(editingRamp ? 'Rampa atualizada!' : 'Rampa criada!');
      setDialogOpen(false);
      setEditingRamp(null);
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const saveSlotMutation = useMutation({
    mutationFn: async (data: typeof slotForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('ramp_slots').update({ label: data.label, slot_key: data.slot_key, category: data.category as any, sort_order: data.sort_order }).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ramp_slots').insert({ label: data.label, slot_key: data.slot_key, category: data.category as any, sort_order: data.sort_order, ramp_id: selectedRamp!.id, unit_id: selectedUnit!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramp-slots'] });
      toast.success(editingSlot ? 'Slot atualizado!' : 'Slot criado!');
      setSlotDialogOpen(false);
      setEditingSlot(null);
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ramp_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramp-slots'] });
      toast.success('Slot removido!');
    },
  });

  const openCreate = () => {
    setEditingRamp(null);
    setFormData({ name: '', code: '', type: 'standard', active: true, sort_order: (ramps?.length || 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (ramp: Ramp) => {
    setEditingRamp(ramp);
    setFormData({ name: ramp.name, code: ramp.code, type: ramp.type || 'standard', active: ramp.active, sort_order: ramp.sort_order });
    setDialogOpen(true);
  };

  const openSlots = (ramp: Ramp) => {
    setSelectedRamp(ramp);
  };

  const openCreateSlot = () => {
    setEditingSlot(null);
    setSlotForm({ label: '', slot_key: '', category: 'other', sort_order: (slots?.length || 0) + 1 });
    setSlotDialogOpen(true);
  };

  const openEditSlot = (slot: RampSlot) => {
    setEditingSlot(slot);
    setSlotForm({ label: slot.label, slot_key: slot.slot_key, category: slot.category, sort_order: slot.sort_order });
    setSlotDialogOpen(true);
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
          <Link to={selectedRamp ? '#' : '/admin'} onClick={selectedRamp ? () => setSelectedRamp(null) : undefined}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{selectedRamp ? `Slots - ${selectedRamp.name}` : 'Rampas'}</h2>
            <p className="text-muted-foreground">{selectedRamp ? 'Configurar slots da rampa' : `Gerenciar rampas de ${selectedUnit.name}`}</p>
          </div>
          <Button onClick={selectedRamp ? openCreateSlot : openCreate} className="ml-auto">
            <Plus className="w-4 h-4 mr-2" />{selectedRamp ? 'Novo Slot' : 'Nova Rampa'}
          </Button>
        </div>

        {!selectedRamp ? (
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : ramps?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhuma rampa cadastrada</TableCell></TableRow>
                  ) : (
                    ramps?.map((ramp) => (
                      <TableRow key={ramp.id}>
                        <TableCell className="font-medium">{ramp.name}</TableCell>
                        <TableCell>{ramp.code}</TableCell>
                        <TableCell>{ramp.type === 'standard' ? 'Padrão' : ramp.type}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${ramp.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                            {ramp.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openSlots(ramp)}><Settings2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(ramp)}><Pencil className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Chave</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum slot cadastrado</TableCell></TableRow>
                  ) : (
                    slots?.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-medium">{slot.label}</TableCell>
                        <TableCell>{slot.slot_key}</TableCell>
                        <TableCell>{FOOD_CATEGORIES.find(c => c.value === slot.category)?.label || slot.category}</TableCell>
                        <TableCell>{slot.sort_order}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditSlot(slot)}><Pencil className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Ramp Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRamp ? 'Editar Rampa' : 'Nova Rampa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...formData, id: editingRamp?.id }); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Padrão</SelectItem>
                    <SelectItem value="special">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Ordem</Label>
                <Input id="sort_order" type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="active" checked={formData.active} onCheckedChange={(checked) => setFormData({ ...formData, active: checked })} />
                <Label htmlFor="active">Ativo</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Slot Dialog */}
        <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSlot ? 'Editar Slot' : 'Novo Slot'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveSlotMutation.mutate({ ...slotForm, id: editingSlot?.id }); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input id="label" value={slotForm.label} onChange={(e) => setSlotForm({ ...slotForm, label: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot_key">Chave (slot_key)</Label>
                <Input id="slot_key" value={slotForm.slot_key} onChange={(e) => setSlotForm({ ...slotForm, slot_key: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={slotForm.category} onValueChange={(v) => setSlotForm({ ...slotForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOOD_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot_sort_order">Ordem</Label>
                <Input id="slot_sort_order" type="number" value={slotForm.sort_order} onChange={(e) => setSlotForm({ ...slotForm, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSlotDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveSlotMutation.isPending}>{saveSlotMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}
