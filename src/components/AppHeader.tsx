import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/contexts/UnitContext';
import { UnitSelector } from './UnitSelector';
import { AudioControls } from './AudioControls';
import { AlertSettingsDialog } from './AlertSettingsDialog';
import { NotificationHistoryPopover } from './NotificationHistoryPopover';
import { OnlineUsersIndicator } from './OnlineUsersIndicator';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LogOut, 
  Eye, 
  Monitor, 
  Settings, 
  User,
  BarChart3
} from 'lucide-react';
import logoDark from '@/assets/logo.png';
import logoLight from '@/assets/logo-light.png';
import { useTheme } from 'next-themes';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { userRole } = useUnit();
  const { resolvedTheme } = useTheme();
  const logoImg = resolvedTheme === 'dark' ? logoDark : logoLight;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.user_metadata?.full_name || user?.email || '';
  const location = useLocation();

  const navItems = [
    { path: '/observer', label: 'Observador', icon: Eye, roles: ['admin', 'observer'] },
    { path: '/monitor', label: 'Monitor', icon: Monitor, roles: ['admin', 'kitchen'] },
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin'] },
    { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(
    item => !userRole || item.roles.includes(userRole)
  );

  return (
    <header className="industrial-header">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImg} alt="VV Refeições" className="h-8 w-auto" />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <UnitSelector />

            {/* Online Users */}
            <OnlineUsersIndicator />

            {/* Notification History */}
            <NotificationHistoryPopover />

            {/* Audio Controls */}
            <AudioControls />
            
            {/* Alert Settings */}
            <AlertSettingsDialog />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {displayName ? getInitials(displayName) : <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
