import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Clock, CheckCircle2, AlertTriangle, TrendingUp, Calendar, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';
import type { Tables, Enums } from '@/integrations/supabase/types';

type StatusEvent = Tables<'status_events'>;
type EventType = Enums<'event_type'>;
type ItemStatus = Enums<'item_status'>;

const eventTypeLabels: Record<EventType, string> = {
  status_change: 'Mudança de Status',
  sla_overdue: 'SLA Excedido',
  acknowledge: 'Reconhecido',
  resolved: 'Resolvido',
  preparing: 'Em Preparo',
};

const statusLabels: Record<ItemStatus, string> = {
  ok: 'OK',
  attention: 'Atenção',
  missing: 'Faltando',
  preparing: 'Preparando',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)'];

export default function AdminReports() {
  const { selectedUnit, units } = useUnit();
  const { exportToExcel, exportToPDF } = useReportExport();
  const [filterUnitId, setFilterUnitId] = useState<string>(selectedUnit?.id || '');
  const [periodDays, setPeriodDays] = useState<string>('7');

  const startDate = startOfDay(subDays(new Date(), parseInt(periodDays)));
  const endDate = endOfDay(new Date());

  // Fetch status events for the period
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['report-events', filterUnitId, periodDays],
    queryFn: async () => {
      if (!filterUnitId) return [];
      
      const { data, error } = await supabase
        .from('status_events')
        .select('*')
        .eq('unit_id', filterUnitId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StatusEvent[];
    },
    enabled: !!filterUnitId,
  });

  // Fetch current status for SLA metrics
  const { data: currentStatuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['report-statuses', filterUnitId],
    queryFn: async () => {
      if (!filterUnitId) return [];
      
      const { data, error } = await supabase
        .from('current_status')
        .select('*')
        .eq('unit_id', filterUnitId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!filterUnitId,
  });

  // Fetch ramps for names
  const { data: ramps } = useQuery({
    queryKey: ['report-ramps', filterUnitId],
    queryFn: async () => {
      if (!filterUnitId) return [];
      
      const { data, error } = await supabase
        .from('ramps')
        .select('id, name, code')
        .eq('unit_id', filterUnitId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!filterUnitId,
  });

  const rampsMap = new Map(ramps?.map(r => [r.id, r]) || []);

  // Calculate metrics
  const metrics = React.useMemo(() => {
    if (!events || events.length === 0) {
      return {
        totalEvents: 0,
        slaCompliance: 0,
        avgResponseTime: 0,
        overdueCount: 0,
        resolvedCount: 0,
        eventsByType: [],
        eventsByDay: [],
        eventsByRamp: [],
      };
    }

    // Count events by type
    const typeCount: Record<string, number> = {};
    events.forEach(e => {
      typeCount[e.event_type] = (typeCount[e.event_type] || 0) + 1;
    });

    const eventsByType = Object.entries(typeCount).map(([type, count]) => ({
      name: eventTypeLabels[type as EventType] || type,
      value: count,
    }));

    // Count events by day
    const dayCount: Record<string, number> = {};
    events.forEach(e => {
      const day = format(new Date(e.created_at), 'dd/MM');
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    const eventsByDay = Object.entries(dayCount)
      .map(([day, count]) => ({ day, eventos: count }))
      .reverse();

    // Count events by ramp
    const rampCount: Record<string, number> = {};
    events.forEach(e => {
      const rampName = rampsMap.get(e.ramp_id)?.name || 'Desconhecido';
      rampCount[rampName] = (rampCount[rampName] || 0) + 1;
    });

    const eventsByRamp = Object.entries(rampCount)
      .map(([ramp, count]) => ({ ramp, eventos: count }))
      .sort((a, b) => b.eventos - a.eventos)
      .slice(0, 10);

    // Calculate SLA compliance from current statuses
    const statusesWithSla = currentStatuses?.filter(s => s.sla_met !== null) || [];
    const slaMetCount = statusesWithSla.filter(s => s.sla_met === true).length;
    const slaCompliance = statusesWithSla.length > 0 
      ? Math.round((slaMetCount / statusesWithSla.length) * 100) 
      : 0;

    // Calculate average response time (from alert_started_at to acknowledged_at)
    const responseTimes: number[] = [];
    currentStatuses?.forEach(s => {
      if (s.alert_started_at && s.acknowledged_at) {
        const alertTime = new Date(s.alert_started_at).getTime();
        const ackTime = new Date(s.acknowledged_at).getTime();
        responseTimes.push((ackTime - alertTime) / 1000 / 60); // in minutes
      }
    });

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10
      : 0;

    const overdueCount = events.filter(e => e.event_type === 'sla_overdue').length;
    const resolvedCount = events.filter(e => e.event_type === 'resolved').length;

    return {
      totalEvents: events.length,
      slaCompliance,
      avgResponseTime,
      overdueCount,
      resolvedCount,
      eventsByType,
      eventsByDay,
      eventsByRamp,
    };
  }, [events, currentStatuses, rampsMap]);

  // Set initial filter when units load
  React.useEffect(() => {
    if (!filterUnitId && selectedUnit?.id) {
      setFilterUnitId(selectedUnit.id);
    }
  }, [selectedUnit, filterUnitId]);

  const isLoading = eventsLoading || statusesLoading;

  const periodLabels: Record<string, string> = {
    '1': 'Últimas 24 horas',
    '7': 'Últimos 7 dias',
    '14': 'Últimos 14 dias',
    '30': 'Últimos 30 dias',
  };

  const handleExportExcel = () => {
    const selectedUnitData = units?.find(u => u.id === filterUnitId);
    if (!selectedUnitData || !events) return;

    exportToExcel({
      events: events.map(e => ({
        created_at: e.created_at,
        ramp_name: rampsMap.get(e.ramp_id)?.name || 'Desconhecido',
        event_type: e.event_type,
        from_status: e.from_status,
        to_status: e.to_status,
        slot_key: e.slot_key,
      })),
      metrics: {
        slaCompliance: metrics.slaCompliance,
        avgResponseTime: metrics.avgResponseTime,
        overdueCount: metrics.overdueCount,
        resolvedCount: metrics.resolvedCount,
        totalEvents: metrics.totalEvents,
      },
      unitName: selectedUnitData.name,
      periodLabel: periodLabels[periodDays] || `Últimos ${periodDays} dias`,
      startDate,
      endDate,
    });
  };

  const handleExportPDF = () => {
    const selectedUnitData = units?.find(u => u.id === filterUnitId);
    if (!selectedUnitData || !events) return;

    exportToPDF({
      events: events.map(e => ({
        created_at: e.created_at,
        ramp_name: rampsMap.get(e.ramp_id)?.name || 'Desconhecido',
        event_type: e.event_type,
        from_status: e.from_status,
        to_status: e.to_status,
        slot_key: e.slot_key,
      })),
      metrics: {
        slaCompliance: metrics.slaCompliance,
        avgResponseTime: metrics.avgResponseTime,
        overdueCount: metrics.overdueCount,
        resolvedCount: metrics.resolvedCount,
        totalEvents: metrics.totalEvents,
      },
      unitName: selectedUnitData.name,
      periodLabel: periodLabels[periodDays] || `Últimos ${periodDays} dias`,
      startDate,
      endDate,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Relatórios</h2>
            <p className="text-muted-foreground">Métricas de SLA e histórico de eventos</p>
          </div>
          
          {/* Export Buttons */}
          {filterUnitId && !isLoading && events && events.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-64">
            <Label className="text-sm text-muted-foreground mb-1 block">Unidade</Label>
            <Select value={filterUnitId} onValueChange={setFilterUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma unidade" />
              </SelectTrigger>
              <SelectContent>
                {units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <Label className="text-sm text-muted-foreground mb-1 block">Período</Label>
            <Select value={periodDays} onValueChange={setPeriodDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Últimas 24h</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!filterUnitId ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              Selecione uma unidade para ver os relatórios
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              Carregando dados...
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Conformidade SLA
                  </CardDescription>
                  <CardTitle className="text-3xl">{metrics.slaCompliance}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Itens dentro do tempo de SLA
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Tempo Médio de Resposta
                  </CardDescription>
                  <CardTitle className="text-3xl">{metrics.avgResponseTime} min</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Do alerta ao reconhecimento
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    SLA Excedidos
                  </CardDescription>
                  <CardTitle className="text-3xl text-destructive">{metrics.overdueCount}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    No período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Total de Eventos
                  </CardDescription>
                  <CardTitle className="text-3xl">{metrics.totalEvents}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {metrics.resolvedCount} resolvidos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2 mb-6">
              {/* Events by Day */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Eventos por Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.eventsByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={metrics.eventsByDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="eventos" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Sem dados para o período
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Events by Type */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Eventos por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.eventsByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={metrics.eventsByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {metrics.eventsByType.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Sem dados para o período
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Events by Ramp */}
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Eventos por Rampa (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.eventsByRamp.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.eventsByRamp} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="ramp" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="eventos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados para o período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Events Table */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Eventos</CardTitle>
                <CardDescription>Últimos 50 eventos do período</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Rampa</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhum evento no período selecionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      events?.slice(0, 50).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {rampsMap.get(event.ramp_id)?.name || 'Desconhecido'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              event.event_type === 'sla_overdue' ? 'bg-destructive/20 text-destructive' :
                              event.event_type === 'resolved' ? 'bg-green-500/20 text-green-400' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {eventTypeLabels[event.event_type]}
                            </span>
                          </TableCell>
                          <TableCell>
                            {event.from_status && (
                              <span className="text-muted-foreground">
                                {statusLabels[event.from_status]} →{' '}
                              </span>
                            )}
                            <span className="font-medium">{statusLabels[event.to_status]}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
