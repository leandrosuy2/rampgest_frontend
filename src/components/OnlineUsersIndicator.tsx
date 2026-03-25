import React from 'react';
import { Users, Monitor, Eye, Settings, BarChart3, User, Home } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOnlineUsers, OnlineUser } from '@/hooks/useOnlineUsers';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const pageIcons: Record<string, React.ElementType> = {
  'Monitor': Monitor,
  'Observador': Eye,
  'Admin': Settings,
  'Dashboard': BarChart3,
  'Perfil': User,
  'Início': Home,
};

const pageColors: Record<string, string> = {
  'Monitor': 'text-red-500 bg-red-500/10',
  'Observador': 'text-yellow-500 bg-yellow-500/10',
  'Admin': 'text-blue-500 bg-blue-500/10',
  'Dashboard': 'text-purple-500 bg-purple-500/10',
  'Perfil': 'text-gray-500 bg-gray-500/10',
  'Início': 'text-green-500 bg-green-500/10',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function OnlineUserItem({ user }: { user: OnlineUser }) {
  const Icon = pageIcons[user.page] || User;
  const colorClasses = pageColors[user.page] || 'text-gray-500 bg-gray-500/10';

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="relative">
        <Avatar className="w-8 h-8">
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback className="text-xs bg-primary/20 text-primary">
            {getInitials(user.fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.fullName}</p>
        <div className="flex items-center gap-1.5">
          <span className={cn('p-0.5 rounded', colorClasses)}>
            <Icon className="w-3 h-3" />
          </span>
          <span className="text-xs text-muted-foreground">{user.page}</span>
        </div>
      </div>
    </div>
  );
}

export function OnlineUsersIndicator() {
  const { onlineUsers, totalOnline } = useOnlineUsers();

  const usersByPage = onlineUsers.reduce((acc, user) => {
    if (!acc[user.page]) acc[user.page] = [];
    acc[user.page].push(user);
    return acc;
  }, {} as Record<string, OnlineUser[]>);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
          <div className="relative">
            <Users className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </span>
          </div>
          <span className="text-xs font-medium">{totalOnline}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários Online
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalOnline} usuário{totalOnline !== 1 ? 's' : ''} nesta unidade
          </p>
        </div>

        <div className="p-2 max-h-[300px] overflow-y-auto">
          <div className="mb-2">
            <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Você</p>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5">
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    EU
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Você está aqui</p>
                <p className="text-xs text-muted-foreground">Online agora</p>
              </div>
            </div>
          </div>

          {onlineUsers.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                Outros usuários ({onlineUsers.length})
              </p>
              <div className="space-y-1">
                {onlineUsers.map((user) => (
                  <OnlineUserItem key={user.oderId} user={user} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhum outro usuário online</p>
            </div>
          )}
        </div>

        {Object.keys(usersByPage).length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Por página</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(usersByPage).map(([page, users]) => {
                const Icon = pageIcons[page] || User;
                const colorClasses = pageColors[page] || 'text-gray-500 bg-gray-500/10';
                return (
                  <Tooltip key={page}>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                        colorClasses
                      )}>
                        <Icon className="w-3 h-3" />
                        <span>{users.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{page}: {users.map(u => u.fullName).join(', ')}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
