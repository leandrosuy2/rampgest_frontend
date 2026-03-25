import React from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Utensils, Clock, Users, BarChart3, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

const adminSections = [
  { title: 'Unidades', description: 'Gerenciar unidades', icon: Building2, path: '/admin/units' },
  { title: 'Rampas', description: 'Configurar rampas e slots', icon: Utensils, path: '/admin/ramps' },
  { title: 'Alimentos', description: 'Catálogo de alimentos', icon: Utensils, path: '/admin/food-items' },
  { title: 'Cardápio', description: 'Montar cardápio do dia', icon: Utensils, path: '/admin/menu' },
  { title: 'SLA', description: 'Configurar tempos de SLA', icon: Clock, path: '/admin/sla' },
  { title: 'Usuários', description: 'Gerenciar usuários', icon: Users, path: '/admin/users' },
  { title: 'Escalas', description: 'Agendar turnos', icon: CalendarDays, path: '/admin/schedules' },
  { title: 'Relatórios', description: 'Ver relatórios e métricas', icon: BarChart3, path: '/admin/reports' },
];

export default function Admin() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Administração</h2>
          <p className="text-muted-foreground">Gerencie unidades, rampas, cardápios e configurações</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.path} to={section.path}>
                <Card className="glass-card h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
