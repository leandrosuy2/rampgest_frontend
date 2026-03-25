import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnit } from '@/contexts/UnitContext';
import { format, startOfDay, endOfDay, subHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { 
  TrendingUp, Clock, AlertTriangle, CheckCircle2, 
  Activity, Utensils, Timer, Zap, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Tables, Enums } from '@/integrations/supabase/types';

type CurrentStatus = Tables<'current_status'>;
type StatusEvent = Tables<'status_events'>;
type ItemStatus = Enums<'item_status'>;

const STATUS_COLORS = {
  ok: 'hsl(142, 76%, 36%)',
  attention: 'hsl(38, 92%, 50%)',
  missing: 'hsl(0, 84%, 60%)',
  preparing: 'hsl(217, 91%, 60%)',
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  ok: 'OK',
  attention: 'Atenção',
  missing: 'Faltando',
  preparing: 'Preparando',
};

export default function StatsDashboard() {
  const { selectedUnit } = useUnit();
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);

  // Fetch current status
  const { data: currentStatuses } = useQuery({
    queryKey: ['dashboard-status', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit?.id) return [];
      const { data, error } = await supabase
        .from('current_status')
        .select('*')
        .eq('unit_id', selectedUnit.id);
      if (error) throw error;
      return data as CurrentStatus[];
    },
    enabled: !!selectedUnit?.id,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch today's events
  const { data: todayEvents } = useQuery({
    queryKey: ['dashboard-events', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit?.id) return [];
      const { data, error } = await supabase
        .from('status_events')
        .select('*')
        .eq('unit_id', selectedUnit.id)
        .gte('created_at', startOfToday.toISOString())
        .lte('created_at', endOfToday.toISOString())
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as StatusEvent[];
    },
    enabled: !!selectedUnit?.id,
    refetchInterval: 30000,
  });

  // Fetch ramps
  const { data: ramps } = useQuery({
    queryKey: ['dashboard-ramps', selectedUnit?.id],
    queryFn: async () => {
      if (!selectedUnit?.id) return [];
      const { data, error } = await supabase
        .from('ramps')
        .select('id, name, code')
        .eq('unit_id', selectedUnit.id)
        .eq('active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUnit?.id,
  });

  const rampsMap = new Map(ramps?.map(r => [r.id, r]) || []);

  // Calculate metrics
  const metrics = React.useMemo(() => {
    const statuses = currentStatuses || [];
    const events = todayEvents || [];

    // Status distribution
    const statusCount: Record<ItemStatus, number> = { ok: 0, attention: 0, missing: 0, preparing: 0 };
    statuses.forEach(s => {
      statusCount[s.status] = (statusCount[s.status] || 0) + 1;
    });

    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      name: STATUS_LABELS[status as ItemStatus],
      value: count,
      fill: STATUS_COLORS[status as ItemStatus],
    }));

    // SLA compliance
    const withSla = statuses.filter(s => s.sla_met !== null);
    const slaMetCount = withSla.filter(s => s.sla_met === true).length;
    const slaCompliance = withSla.length > 0 ? Math.round((slaMetCount / withSla.length) * 100) : 100;

    // Average response time
    const responseTimes: number[] = [];
    statuses.forEach(s => {
      if (s.alert_started_at && s.acknowledged_at) {
        const mins = differenceInMinutes(new Date(s.acknowledged_at), new Date(s.alert_started_at));
        responseTimes.push(mins);
      }
    });
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10
      : 0;

    // Events by hour
    const hourlyEvents: Record<number, number> = {};
    for (let i = 6; i <= 22; i++) hourlyEvents[i] = 0;
    events.forEach(e => {
      const hour = new Date(e.created_at).getHours();
      if (hour >= 6 && hour <= 22) {
        hourlyEvents[hour] = (hourlyEvents[hour] || 0) + 1;
      }
    });
    const eventsByHour = Object.entries(hourlyEvents).map(([hour, count]) => ({
      hora: `${hour}h`,
      eventos: count,
    }));

    // Events by ramp
    const rampEvents: Record<string, { total: number; overdue: number }> = {};
    events.forEach(e => {
      const rampName = rampsMap.get(e.ramp_id)?.name || 'Outros';
      if (!rampEvents[rampName]) rampEvents[rampName] = { total: 0, overdue: 0 };
      rampEvents[rampName].total++;
      if (e.event_type === 'sla_overdue') rampEvents[rampName].overdue++;
    });
    const eventsByRamp = Object.entries(rampEvents)
      .map(([ramp, data]) => ({ ramp, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Counts
    const overdueToday = events.filter(e => e.event_type === 'sla_overdue').length;
    const resolvedToday = events.filter(e => e.event_type === 'resolved').length;
    const totalItems = statuses.length;
    const criticalItems = statusCount.missing + statusCount.attention;

    // Trend comparison (mock - would need yesterday's data)
    const trendUp = slaCompliance >= 80;

    return {
      statusDistribution,
      slaCompliance,
      avgResponseTime,
      eventsByHour,
      eventsByRamp,
      overdueToday,
      resolvedToday,
      totalItems,
      criticalItems,
      totalEvents: events.length,
      trendUp,
    };
  }, [currentStatuses, todayEvents, rampsMap]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (!selectedUnit) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12 text-muted-foreground">
            Selecione uma unidade para ver o dashboard
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              {selectedUnit.name} • {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4 animate-pulse text-green-500" />
            Atualização automática
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* KPI Cards */}
          <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Conformidade SLA
                </CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  {metrics.slaCompliance}%
                  {metrics.trendUp ? (
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${metrics.slaCompliance}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Tempo Médio Resposta
                </CardDescription>
                <CardTitle className="text-3xl">{metrics.avgResponseTime} min</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Do alerta ao reconhecimento
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  SLA Excedidos Hoje
                </CardDescription>
                <CardTitle className="text-3xl text-destructive">{metrics.overdueToday}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {metrics.criticalItems} itens em atenção agora
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Eventos Hoje
                </CardDescription>
                <CardTitle className="text-3xl">{metrics.totalEvents}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {metrics.resolvedToday} resolvidos
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Row 1 */}
          <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
            {/* Status Distribution */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Utensils className="w-5 h-5" />
                  Status Atual
                </CardTitle>
                <CardDescription>{metrics.totalItems} itens monitorados</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.statusDistribution.some(s => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={metrics.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {metrics.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hourly Activity */}
            <Card className="glass-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Atividade por Hora
                </CardTitle>
                <CardDescription>Eventos ao longo do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={metrics.eventsByHour}>
                    <defs>
                      <linearGradient id="colorEventos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="eventos" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorEventos)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Row 2 */}
          <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
            {/* Events by Ramp */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Eventos por Rampa
                </CardTitle>
                <CardDescription>Total e SLA excedidos</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.eventsByRamp.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={metrics.eventsByRamp} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis 
                        type="category" 
                        dataKey="ramp" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={11} 
                        width={80}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Total" />
                      <Bar dataKey="overdue" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="Excedidos" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Sem eventos hoje
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SLA Gauge */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Performance SLA
                </CardTitle>
                <CardDescription>Meta: 95% de conformidade</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="60%" 
                    outerRadius="90%" 
                    barSize={20} 
                    data={[
                      { name: 'Meta', value: 95, fill: 'hsl(var(--muted))' },
                      { name: 'Atual', value: metrics.slaCompliance, fill: metrics.slaCompliance >= 95 ? 'hsl(142, 76%, 36%)' : metrics.slaCompliance >= 80 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)' },
                    ]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      cornerRadius={10}
                    />
                    <Legend 
                      iconSize={10} 
                      layout="horizontal" 
                      verticalAlign="bottom"
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center -mt-16">
                  <span className="text-4xl font-bold">{metrics.slaCompliance}%</span>
                  <p className="text-sm text-muted-foreground">Conformidade atual</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
