import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ArrowLeft, Mail, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';
import { useUnit } from '@/contexts/UnitContext';

type Profile = Tables<'profiles'>;
type AppRole = Enums<'app_role'>;

interface UserWithProfile {
  id: string;
  user_id: string;
  unit_id: string;
  role: AppRole;
  created_at: string;
  invited_by: string | null;
  profile: Profile | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  observer: 'Observador',
  kitchen: 'Cozinha',
};

const roleBadgeColors: Record<AppRole, string> = {
  admin: 'bg-primary/20 text-primary',
  observer: 'bg-blue-500/20 text-blue-400',
  kitchen: 'bg-orange-500/20 text-orange-400',
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { selectedUnit, units } = useUnit();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserUnit, setSelectedUserUnit] = useState<UserWithProfile | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', role: 'observer' as AppRole, unitId: '' });
  const [editRole, setEditRole] = useState<AppRole>('observer');
  const [filterUnitId, setFilterUnitId] = useState<string>(selectedUnit?.id || '');

  // Fetch users with their profiles for the selected unit
  const { data: userUnits, isLoading } = useQuery({
    queryKey: ['admin-users', filterUnitId],
    queryFn: async () => {
      if (!filterUnitId) return [];
      
      // First get user_units
      const { data: userUnitsData, error: userUnitsError } = await supabase
        .from('user_units')
        .select('*')
        .eq('unit_id', filterUnitId)
        .order('created_at', { ascending: false });
      
      if (userUnitsError) throw userUnitsError;
      if (!userUnitsData || userUnitsData.length === 0) return [];

      // Get profiles for these users
      const userIds = userUnitsData.map(uu => uu.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;

      // Combine data
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return userUnitsData.map(uu => ({
        ...uu,
        profile: profilesMap.get(uu.user_id) || null
      })) as UserWithProfile[];
    },
    enabled: !!filterUnitId,
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; fullName: string; role: AppRole; unitId: string }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          unitId: data.unitId,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(data.message || 'Convite enviado com sucesso!');
      setInviteDialogOpen(false);
      setInviteForm({ email: '', fullName: '', role: 'observer', unitId: filterUnitId });
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_units')
        .update({ role })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Permissão atualizada!');
      setEditDialogOpen(false);
      setSelectedUserUnit(null);
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  // Remove user from unit mutation
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_units')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário removido da unidade!');
      setDeleteDialogOpen(false);
      setSelectedUserUnit(null);
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const openInvite = () => {
    setInviteForm({ email: '', fullName: '', role: 'observer', unitId: filterUnitId });
    setInviteDialogOpen(true);
  };

  const openEdit = (userUnit: UserWithProfile) => {
    setSelectedUserUnit(userUnit);
    setEditRole(userUnit.role);
    setEditDialogOpen(true);
  };

  const openDelete = (userUnit: UserWithProfile) => {
    setSelectedUserUnit(userUnit);
    setDeleteDialogOpen(true);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate(inviteForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserUnit) {
      updateRoleMutation.mutate({ id: selectedUserUnit.id, role: editRole });
    }
  };

  const handleDelete = () => {
    if (selectedUserUnit) {
      removeMutation.mutate(selectedUserUnit.id);
    }
  };

  // Set initial filter when units load
  React.useEffect(() => {
    if (!filterUnitId && selectedUnit?.id) {
      setFilterUnitId(selectedUnit.id);
    }
  }, [selectedUnit, filterUnitId]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Usuários</h2>
            <p className="text-muted-foreground">Gerenciar usuários e permissões por unidade</p>
          </div>
        </div>

        {/* Unit filter and invite button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-64">
            <Label htmlFor="unit-filter" className="text-sm text-muted-foreground mb-1 block">Filtrar por unidade</Label>
            <Select value={filterUnitId} onValueChange={setFilterUnitId}>
              <SelectTrigger id="unit-filter">
                <SelectValue placeholder="Selecione uma unidade" />
              </SelectTrigger>
              <SelectContent>
                {units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={openInvite} disabled={!filterUnitId}>
              <UserPlus className="w-4 h-4 mr-2" />
              Convidar Usuário
            </Button>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell>
                  </TableRow>
                ) : !filterUnitId ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Selecione uma unidade para ver os usuários
                    </TableCell>
                  </TableRow>
                ) : userUnits?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário nesta unidade
                    </TableCell>
                  </TableRow>
                ) : (
                  userUnits?.map((userUnit) => (
                    <TableRow key={userUnit.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {userUnit.profile?.full_name || 'Usuário'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {userUnit.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${roleBadgeColors[userUnit.role]}`}>
                          {roleLabels[userUnit.role]}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(userUnit.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(userUnit)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDelete(userUnit)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invite Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Convidar Usuário
              </DialogTitle>
              <DialogDescription>
                Envie um convite por email para adicionar um novo usuário à unidade
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo (opcional)</Label>
                <Input
                  id="fullName"
                  placeholder="Nome do usuário"
                  value={inviteForm.fullName}
                  onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Permissão</Label>
                <Select value={inviteForm.role} onValueChange={(value: AppRole) => setInviteForm({ ...inviteForm, role: value })}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="observer">Observador</SelectItem>
                    <SelectItem value="kitchen">Cozinha</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inviteForm.role === 'admin' && 'Acesso total à unidade, pode gerenciar usuários e configurações'}
                  {inviteForm.role === 'observer' && 'Pode marcar status dos itens na rampa'}
                  {inviteForm.role === 'kitchen' && 'Pode ver o monitor e resolver alertas'}
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Permissão</DialogTitle>
              <DialogDescription>
                Altere a permissão de {selectedUserUnit?.profile?.full_name || 'usuário'} nesta unidade
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Permissão</Label>
                <Select value={editRole} onValueChange={(value: AppRole) => setEditRole(value)}>
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="observer">Observador</SelectItem>
                    <SelectItem value="kitchen">Cozinha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover Usuário</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover {selectedUserUnit?.profile?.full_name || 'este usuário'} desta unidade?
                O usuário ainda poderá acessar outras unidades às quais estiver vinculado.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? 'Removendo...' : 'Remover'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
