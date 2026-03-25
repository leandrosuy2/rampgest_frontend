import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/contexts/UnitContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface ShiftSchedule {
  id: string;
  unit_id: string;
  user_id: string;
  date: string;
  shift_type: 'lunch' | 'dinner' | 'both';
  role: 'admin' | 'observer' | 'kitchen';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  user_id: string;
  role: 'admin' | 'observer' | 'kitchen';
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useShiftSchedules(startDate?: Date, endDate?: Date) {
  const { selectedUnit } = useUnit();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ['shift-schedules', selectedUnit?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!selectedUnit?.id) return [];

      let query = supabase
        .from('shift_schedules')
        .select('*')
        .eq('unit_id', selectedUnit.id)
        .order('date', { ascending: true });

      if (startDate) {
        query = query.gte('date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ShiftSchedule[];
    },
    enabled: !!selectedUnit?.id,
  });

  const unitUsersQuery = useQuery({
    queryKey: ['unit-users', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit?.id) return [];

      const { data, error } = await supabase
        .from('user_units')
        .select(`
          user_id,
          role,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('unit_id', selectedUnit.id);

      if (error) throw error;
      
      return (data || []).map(item => ({
        user_id: item.user_id,
        role: item.role,
        profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
      })) as UserWithProfile[];
    },
    enabled: !!selectedUnit?.id,
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (schedule: Omit<ShiftSchedule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('shift_schedules')
        .insert(schedule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-schedules'] });
      toast({ title: 'Turno agendado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao agendar turno', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShiftSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('shift_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-schedules'] });
      toast({ title: 'Turno atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar turno', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-schedules'] });
      toast({ title: 'Turno removido com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao remover turno', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    users: unitUsersQuery.data || [],
    isLoading: schedulesQuery.isLoading || unitUsersQuery.isLoading,
    createSchedule: createScheduleMutation.mutate,
    updateSchedule: updateScheduleMutation.mutate,
    deleteSchedule: deleteScheduleMutation.mutate,
    isCreating: createScheduleMutation.isPending,
    isUpdating: updateScheduleMutation.isPending,
    isDeleting: deleteScheduleMutation.isPending,
  };
}
