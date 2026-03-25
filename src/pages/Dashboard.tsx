import React from 'react';
import { Link } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Monitor, Settings, ChefHat } from 'lucide-react';
export default function Dashboard() {
  const { selectedUnit, userRole, units } = useUnit();

  const actions = [
    { 
      title: 'Observador', 
      description: 'Marcar status dos itens no salão', 
      icon: Eye, 
      path: '/observer',
      roles: ['admin', 'observer'],
      color: 'bg-status-attention/20 text-status-attention'
    },
    { 
      title: 'Monitor Cozinha', 
      description: 'Acompanhar reposições em tempo real', 
      icon: Monitor, 
      path: '/monitor',
      roles: ['admin', 'kitchen'],
      color: 'bg-status-missing/20 text-status-missing'
    },
    { 
      title: 'Administração', 
      description: 'Gerenciar unidades e configurações', 
      icon: Settings, 
      path: '/admin',
      roles: ['admin'],
      color: 'bg-primary/20 text-primary'
    },
  ].filter(action => !userRole || action.roles.includes(userRole));

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <ChefHat className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Controle de Reposição</h1>
          <p className="text-muted-foreground">
            {selectedUnit ? `Unidade: ${selectedUnit.name}` : 'VV Refeições - Sistema de Rampas'}
          </p>
        </div>

        {units.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Você ainda não tem acesso a nenhuma unidade.
            </p>
            <p className="text-sm text-muted-foreground">
              Entre em contato com um administrador para obter acesso.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} to={action.path}>
                  <Card className="glass-card h-full hover:border-primary/50 transition-all hover:scale-[1.02] cursor-pointer">
                    <CardHeader className="text-center">
                      <div className={`w-16 h-16 mx-auto rounded-xl ${action.color} flex items-center justify-center mb-2`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <CardTitle className="text-xl">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
