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
import { Plus, Pencil, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type FoodItem = Tables<'food_items'>;

const FOOD_CATEGORIES = [
  { value: 'protein', label: 'Proteína' },
  { value: 'carb', label: 'Carboidrato' },
  { value: 'salad', label: 'Salada' },
  { value: 'side', label: 'Acompanhamento' },
  { value: 'other', label: 'Outros' },
];

export default function AdminFoodItems() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [formData, setFormData] = useState({ name: '', category: 'other' as string, active: true });

  const { data: foodItems, isLoading } = useQuery({
    queryKey: ['admin-food-items', selectedUnit?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .or(`unit_id.is.null,unit_id.eq.${selectedUnit?.id}`)
        .order('category')
        .order('name');
      if (error) throw error;
      return data as FoodItem[];
    },
    enabled: !!selectedUnit,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('food_items').update({ name: data.name, category: data.category as any, active: data.active }).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('food_items').insert({ name: data.name, category: data.category as any, active: data.active, unit_id: selectedUnit!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-food-items'] });
      toast.success(editingItem ? 'Alimento atualizado!' : 'Alimento criado!');
      setDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', category: 'other', active: true });
    setDialogOpen(true);
  };

  const openEdit = (item: FoodItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, category: item.category, active: item.active });
    setDialogOpen(true);
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
            <h2 className="text-2xl font-bold">Alimentos</h2>
            <p className="text-muted-foreground">Gerenciar catálogo de alimentos</p>
          </div>
          <Button onClick={openCreate} className="ml-auto"><Plus className="w-4 h-4 mr-2" />Novo Alimento</Button>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : foodItems?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum alimento cadastrado</TableCell></TableRow>
                ) : (
                  foodItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{FOOD_CATEGORIES.find(c => c.value === item.category)?.label || item.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${item.unit_id ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {item.unit_id ? 'Unidade' : 'Global'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${item.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {item.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Alimento' : 'Novo Alimento'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...formData, id: editingItem?.id }); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOOD_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
      </main>

      <Footer />
    </div>
  );
}
