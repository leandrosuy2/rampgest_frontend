import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Users, Sun, Moon, Clock, CalendarDays, CalendarRange } from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useShiftSchedules } from '@/hooks/useShiftSchedules';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { WeeklyShiftView } from './WeeklyShiftView';

const shiftLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  lunch: { label: 'Almoço', icon: <Sun className="w-3 h-3" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  dinner: { label: 'Jantar', icon: <Moon className="w-3 h-3" />, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  both: { label: 'Ambos', icon: <Clock className="w-3 h-3" />, color: 'bg-primary/20 text-primary border-primary/30' },
};

const roleLabels: Record<string, { label: string; color: string }> = {
  observer: { label: 'Observador', color: 'bg-blue-500/20 text-blue-400' },
  kitchen: { label: 'Cozinha', color: 'bg-orange-500/20 text-orange-400' },
  admin: { label: 'Admin', color: 'bg-purple-500/20 text-purple-400' },
};

export function ShiftCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    user_id: '',
    shift_type: 'lunch' as 'lunch' | 'dinner' | 'both',
    role: 'observer' as 'admin' | 'observer' | 'kitchen',
    notes: '',
  });

  const { selectedUnit } = useUnit();
  const { user } = useAuth();

  // Extended date range to cover both month and week views
  const queryStart = subMonths(startOfMonth(viewMonth), 1);
  const queryEnd = addMonths(endOfMonth(viewMonth), 1);

  const { 
    schedules, 
    users, 
    isLoading, 
    createSchedule, 
    updateSchedule,
    deleteSchedule,
    isCreating,
    isUpdating,
    isDeleting,
  } = useShiftSchedules(queryStart, queryEnd);

  const handleMoveSchedule = (scheduleId: string, newDate: string) => {
    updateSchedule({ id: scheduleId, date: newDate });
  };

  const schedulesForSelectedDate = useMemo(() => {
    return schedules.filter(s => isSameDay(new Date(s.date), selectedDate));
  }, [schedules, selectedDate]);

  const datesWithSchedules = useMemo(() => {
    const dates = new Set<string>();
    schedules.forEach(s => dates.add(s.date));
    return dates;
  }, [schedules]);

  const getUserName = (userId: string) => {
    const userInfo = users.find(u => u.user_id === userId);
    return userInfo?.profile?.full_name || 'Usuário';
  };

  const getUserAvatar = (userId: string) => {
    const userInfo = users.find(u => u.user_id === userId);
    return userInfo?.profile?.avatar_url;
  };

  const handleCreateSchedule = () => {
    if (!selectedUnit?.id || !newSchedule.user_id) return;

    createSchedule({
      unit_id: selectedUnit.id,
      user_id: newSchedule.user_id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      shift_type: newSchedule.shift_type,
      role: newSchedule.role,
      notes: newSchedule.notes || null,
      created_by: user?.id || null,
    });

    setIsDialogOpen(false);
    setNewSchedule({
      user_id: '',
      shift_type: 'lunch',
      role: 'observer',
      notes: '',
    });
  };

  const modifiers = {
    hasSchedule: (date: Date) => datesWithSchedules.has(format(date, 'yyyy-MM-dd')),
  };

  const modifiersStyles = {
    hasSchedule: {
      backgroundColor: 'hsl(var(--primary) / 0.15)',
      borderRadius: '50%',
    },
  };

  return (
    <div className="space-y-6">
      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'month' | 'week')}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="month" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Mensal
          </TabsTrigger>
          <TabsTrigger value="week" className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4" />
            Semanal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4">
          <WeeklyShiftView
            schedules={schedules}
            users={users}
            onMoveSchedule={handleMoveSchedule}
            onDeleteSchedule={deleteSchedule}
            isUpdating={isUpdating}
          />
        </TabsContent>

        <TabsContent value="month" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Calendário de Turnos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  onMonthChange={setViewMonth}
                  locale={ptBR}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  className="rounded-md border pointer-events-auto"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4 w-full",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: cn(
                      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center"
                    ),
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex w-full",
                    head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full",
                    day: cn(
                      "h-9 w-9 p-0 font-normal",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground",
                      "aria-selected:opacity-100"
                    ),
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                  }}
                />
              </CardContent>
            </Card>

            {/* Day Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full mt-2">
                      <Plus className="w-4 h-4 mr-2" />
                      Agendar Turno
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Agendar turno - {format(selectedDate, "dd/MM/yyyy")}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Operador</Label>
                        <Select
                          value={newSchedule.user_id}
                          onValueChange={(value) => setNewSchedule({ ...newSchedule, user_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o operador" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.profile?.full_name || 'Usuário sem nome'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Turno</Label>
                        <Select
                          value={newSchedule.shift_type}
                          onValueChange={(value: 'lunch' | 'dinner' | 'both') => 
                            setNewSchedule({ ...newSchedule, shift_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lunch">
                              <span className="flex items-center gap-2">
                                <Sun className="w-4 h-4" /> Almoço
                              </span>
                            </SelectItem>
                            <SelectItem value="dinner">
                              <span className="flex items-center gap-2">
                                <Moon className="w-4 h-4" /> Jantar
                              </span>
                            </SelectItem>
                            <SelectItem value="both">
                              <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Ambos
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Função</Label>
                        <Select
                          value={newSchedule.role}
                          onValueChange={(value: 'admin' | 'observer' | 'kitchen') => 
                            setNewSchedule({ ...newSchedule, role: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="observer">Observador</SelectItem>
                            <SelectItem value="kitchen">Cozinha</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                          value={newSchedule.notes}
                          onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                          placeholder="Observações opcionais..."
                          rows={3}
                        />
                      </div>

                      <Button 
                        onClick={handleCreateSchedule} 
                        className="w-full"
                        disabled={!newSchedule.user_id || isCreating}
                      >
                        {isCreating ? 'Agendando...' : 'Confirmar Agendamento'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-4">
                    Carregando...
                  </div>
                ) : schedulesForSelectedDate.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum turno agendado</p>
                  </div>
                ) : (
                  schedulesForSelectedDate.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={getUserAvatar(schedule.user_id) || undefined} />
                        <AvatarFallback className="text-xs">
                          {getUserName(schedule.user_id).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {getUserName(schedule.user_id)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", shiftLabels[schedule.shift_type].color)}
                          >
                            {shiftLabels[schedule.shift_type].icon}
                            <span className="ml-1">{shiftLabels[schedule.shift_type].label}</span>
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", roleLabels[schedule.role].color)}
                          >
                            {roleLabels[schedule.role].label}
                          </Badge>
                        </div>
                        {schedule.notes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {schedule.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSchedule(schedule.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
