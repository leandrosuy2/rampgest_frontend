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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, ArrowLeft, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type SlaRule = Tables<'sla_rules'>;

const APPLIES_TO_OPTIONS = [
  { value: 'default', label: 'Padrão (todas as rampas)' },
  { value: 'ramp', label: 'Rampa específica' },
  { value: 'category', label: 'Categoria específica' },
];

export default function AdminSlaRules() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SlaRule | null>(null);
  const [formData, setFormData] = useState({
    applies_to: 'default',
    key: '',
    sla_minutes_attention: 10,
    sla_minutes_missing: 5,
    active: true,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['admin-sla-rules', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit) return [];
      const { data, error } = await supabase.from('sla_rules').select('*').eq('unit_id', selectedUnit.id).order('applies_to').order('key');
      if (error) throw error;
      return data as SlaRule[];
    },
    enabled: !!selectedUnit,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        applies_to: data.applies_to,
        key: data.applies_to === 'default' ? null : data.key,
        sla_minutes_attention: data.sla_minutes_attention,
        sla_minutes_missing: data.sla_minutes_missing,
        active: data.active,
        unit_id: selectedUnit!.id,
      };
      if (data.id) {
        const { error } = await supabase.from('sla_rules').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sla_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sla-rules'] });
      toast.success(editingRule ? 'Regra SLA atualizada!' : 'Regra SLA criada!');
      setDialogOpen(false);
      setEditingRule(null);
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const openCreate = () => {
    setEditingRule(null);
    setFormData({ applies_to: 'default', key: '', sla_minutes_attention: 10, sla_minutes_missing: 5, active: true });
    setDialogOpen(true);
  };

  const openEdit = (rule: SlaRule) => {
    setEditingRule(rule);
    setFormData({
      applies_to: rule.applies_to,
      key: rule.key || '',
      sla_minutes_attention: rule.sla_minutes_attention || 10,
      sla_minutes_missing: rule.sla_minutes_missing,
      active: rule.active,
    });
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
            <h2 className="text-2xl font-bold">Regras SLA</h2>
            <p className="text-muted-foreground">Configurar tempos de SLA para {selectedUnit.name}</p>
          </div>
          <Button onClick={openCreate} className="ml-auto"><Plus className="w-4 h-4 mr-2" />Nova Regra</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Tempo para Atenção
              </CardTitle>
              <CardDescription>Tempo após o qual o status muda para "Atenção"</CardDescription>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                Tempo para Faltando
              </CardTitle>
              <CardDescription>Tempo após "Atenção" que muda para "Faltando"</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aplica-se a</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Atenção (min)</TableHead>
                  <TableHead>Faltando (min)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : rules?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Nenhuma regra cadastrada</TableCell></TableRow>
                ) : (
                  rules?.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        {APPLIES_TO_OPTIONS.find(o => o.value === rule.applies_to)?.label || rule.applies_to}
                      </TableCell>
                      <TableCell>{rule.key || '-'}</TableCell>
                      <TableCell>{rule.sla_minutes_attention} min</TableCell>
                      <TableCell>{rule.sla_minutes_missing} min</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${rule.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {rule.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}><Pencil className="w-4 h-4" /></Button>
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
              <DialogTitle>{editingRule ? 'Editar Regra SLA' : 'Nova Regra SLA'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...formData, id: editingRule?.id }); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="applies_to">Aplica-se a</Label>
                <Select value={formData.applies_to} onValueChange={(v) => setFormData({ ...formData, applies_to: v, key: v === 'default' ? '' : formData.key })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPLIES_TO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {formData.applies_to !== 'default' && (
                <div className="space-y-2">
                  <Label htmlFor="key">Identificador ({formData.applies_to === 'ramp' ? 'código da rampa' : 'categoria'})</Label>
                  <Input id="key" value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} required />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sla_minutes_attention">Tempo Atenção (min)</Label>
                  <Input id="sla_minutes_attention" type="number" min="1" value={formData.sla_minutes_attention} onChange={(e) => setFormData({ ...formData, sla_minutes_attention: parseInt(e.target.value) || 10 })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sla_minutes_missing">Tempo Faltando (min)</Label>
                  <Input id="sla_minutes_missing" type="number" min="1" value={formData.sla_minutes_missing} onChange={(e) => setFormData({ ...formData, sla_minutes_missing: parseInt(e.target.value) || 5 })} required />
                </div>
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
