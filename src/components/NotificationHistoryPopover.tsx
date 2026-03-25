import React, { useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Clock, AlertTriangle, AlertCircle, ChefHat, CheckCircle, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type NotificationType = 'missing' | 'attention' | 'overdue' | 'preparing' | 'replenished';

const typeIcons: Record<NotificationType, React.ElementType> = {
  missing: AlertCircle,
  attention: AlertTriangle,
  overdue: Clock,
  preparing: ChefHat,
  replenished: CheckCircle,
};

const typeColors: Record<NotificationType, string> = {
  missing: 'text-red-500',
  attention: 'text-yellow-500',
  overdue: 'text-red-700',
  preparing: 'text-blue-500',
  replenished: 'text-green-500',
};

const typeBgColors: Record<NotificationType, string> = {
  missing: 'bg-red-500/10',
  attention: 'bg-yellow-500/10',
  overdue: 'bg-red-700/10',
  preparing: 'bg-blue-500/10',
  replenished: 'bg-green-500/10',
};

const typeLabels: Record<NotificationType, string> = {
  missing: 'Faltando',
  attention: 'Atenção',
  overdue: 'SLA Excedido',
  preparing: 'Preparando',
  replenished: 'Reposto',
};

export function NotificationHistoryPopover() {
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAll,
    removeNotification 
  } = useNotificationContext();

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Type filter
      if (typeFilter !== 'all' && notification.type !== typeFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const notificationDate = new Date(notification.timestamp);
        switch (dateFilter) {
          case 'today':
            if (!isToday(notificationDate)) return false;
            break;
          case 'yesterday':
            if (!isYesterday(notificationDate)) return false;
            break;
          case 'week':
            if (!isAfter(notificationDate, subDays(new Date(), 7))) return false;
            break;
        }
      }

      return true;
    });
  }, [notifications, typeFilter, dateFilter]);

  const hasActiveFilters = typeFilter !== 'all' || dateFilter !== 'all';

  const clearFilters = () => {
    setTypeFilter('all');
    setDateFilter('all');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          title="Histórico de notificações"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h4 className="font-semibold">Notificações</h4>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo lido'}
            </p>
          </div>
          <div className="flex gap-1">
            <Button 
              variant={showFilters ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              title="Filtros"
              className={hasActiveFilters ? 'text-primary' : ''}
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} title="Marcar todas como lidas">
                <CheckCheck className="w-4 h-4" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} title="Limpar todas">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-3 border-b bg-muted/30 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="missing">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        Faltando
                      </div>
                    </SelectItem>
                    <SelectItem value="attention">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                        Atenção
                      </div>
                    </SelectItem>
                    <SelectItem value="overdue">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-red-700" />
                        SLA Excedido
                      </div>
                    </SelectItem>
                    <SelectItem value="preparing">
                      <div className="flex items-center gap-2">
                        <ChefHat className="w-3 h-3 text-blue-500" />
                        Preparando
                      </div>
                    </SelectItem>
                    <SelectItem value="replenished">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Reposto
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Período</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Qualquer data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer data</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="yesterday">Ontem</SelectItem>
                    <SelectItem value="week">Últimos 7 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {hasActiveFilters && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {filteredNotifications.length} resultado{filteredNotifications.length !== 1 ? 's' : ''}
                </p>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Active filters badges */}
        {hasActiveFilters && !showFilters && (
          <div className="flex items-center gap-2 p-2 border-b bg-muted/20">
            {typeFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1">
                {typeLabels[typeFilter as NotificationType]}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-destructive" 
                  onClick={() => setTypeFilter('all')}
                />
              </Badge>
            )}
            {dateFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Calendar className="w-3 h-3" />
                {dateFilter === 'today' ? 'Hoje' : dateFilter === 'yesterday' ? 'Ontem' : '7 dias'}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-destructive" 
                  onClick={() => setDateFilter('all')}
                />
              </Badge>
            )}
          </div>
        )}

        <ScrollArea className="h-[350px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">
                {hasActiveFilters ? 'Nenhuma notificação encontrada' : 'Nenhuma notificação'}
              </p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const Icon = typeIcons[notification.type];
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group',
                      !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                        typeBgColors[notification.type]
                      )}>
                        <Icon className={cn('w-5 h-5', typeColors[notification.type])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm',
                            !notification.read && 'font-medium'
                          )}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {typeLabels[notification.type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.timestamp, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
