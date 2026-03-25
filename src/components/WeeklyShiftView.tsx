import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, GripVertical, Sun, Moon, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShiftSchedule, UserWithProfile } from '@/hooks/useShiftSchedules';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface WeeklyShiftViewProps {
  schedules: ShiftSchedule[];
  users: UserWithProfile[];
  onMoveSchedule: (scheduleId: string, newDate: string) => void;
  onDeleteSchedule: (id: string) => void;
  isUpdating: boolean;
}

const shiftLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  lunch: { label: 'Almoço', icon: <Sun className="w-3 h-3" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  dinner: { label: 'Jantar', icon: <Moon className="w-3 h-3" />, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  both: { label: 'Ambos', icon: <Clock className="w-3 h-3" />, color: 'bg-primary/20 text-primary border-primary/30' },
};

const roleLabels: Record<string, { label: string; color: string }> = {
  observer: { label: 'Obs', color: 'bg-blue-500/20 text-blue-400' },
  kitchen: { label: 'Coz', color: 'bg-orange-500/20 text-orange-400' },
  admin: { label: 'Adm', color: 'bg-purple-500/20 text-purple-400' },
};

export function WeeklyShiftView({ 
  schedules, 
  users, 
  onMoveSchedule, 
  onDeleteSchedule,
  isUpdating 
}: WeeklyShiftViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [draggedSchedule, setDraggedSchedule] = useState<ShiftSchedule | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const schedulesByDay = useMemo(() => {
    const map: Record<string, ShiftSchedule[]> = {};
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      map[dateKey] = schedules.filter(s => s.date === dateKey);
    });
    return map;
  }, [schedules, weekDays]);

  const getUserName = (userId: string) => {
    const userInfo = users.find(u => u.user_id === userId);
    return userInfo?.profile?.full_name || 'Usuário';
  };

  const getUserAvatar = (userId: string) => {
    const userInfo = users.find(u => u.user_id === userId);
    return userInfo?.profile?.avatar_url;
  };

  const handleDragStart = (e: React.DragEvent, schedule: ShiftSchedule) => {
    setDraggedSchedule(schedule);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', schedule.id);
  };

  const handleDragEnd = () => {
    setDraggedSchedule(null);
    setDragOverDay(null);
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dateKey);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    setDragOverDay(null);
    
    if (draggedSchedule && draggedSchedule.date !== dateKey) {
      onMoveSchedule(draggedSchedule.id, dateKey);
    }
    setDraggedSchedule(null);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Visão Semanal</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(weekStart, "dd MMM", { locale: ptBR })} - {format(weekEnd, "dd MMM yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Header */}
          {weekDays.map(day => (
            <div 
              key={format(day, 'yyyy-MM-dd')} 
              className={cn(
                "text-center p-2 rounded-t-lg font-medium text-sm",
                isToday(day) ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <div className="text-xs opacity-80">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className="text-lg">
                {format(day, 'd')}
              </div>
            </div>
          ))}

          {/* Day columns */}
          {weekDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySchedules = schedulesByDay[dateKey] || [];
            const isDragOver = dragOverDay === dateKey;

            return (
              <div
                key={`col-${dateKey}`}
                className={cn(
                  "min-h-[200px] rounded-b-lg border-2 border-dashed transition-all duration-200 p-1",
                  isDragOver 
                    ? "border-primary bg-primary/10" 
                    : "border-transparent bg-muted/30",
                  isToday(day) && "bg-primary/5"
                )}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateKey)}
              >
                <AnimatePresence mode="popLayout">
                  {daySchedules.map((schedule) => (
                    <motion.div
                      key={schedule.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, schedule)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group relative p-2 mb-1 rounded-md bg-card border border-border/50 cursor-grab active:cursor-grabbing transition-all",
                        "hover:shadow-md hover:border-primary/30",
                        draggedSchedule?.id === schedule.id && "opacity-50 scale-95",
                        isUpdating && "pointer-events-none opacity-60"
                      )}
                    >
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3 h-3 text-muted-foreground" />
                      </div>
                      
                      <div className="flex items-center gap-1.5 pl-3">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={getUserAvatar(schedule.user_id) || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getUserName(schedule.user_id).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">
                            {getUserName(schedule.user_id).split(' ')[0]}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge 
                              variant="outline" 
                              className={cn("text-[9px] px-1 py-0", shiftLabels[schedule.shift_type].color)}
                            >
                              {shiftLabels[schedule.shift_type].icon}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn("text-[9px] px-1 py-0", roleLabels[schedule.role].color)}
                            >
                              {roleLabels[schedule.role].label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {daySchedules.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/50">
                      Arraste aqui
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            <span>Arraste para mover turnos entre dias</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
