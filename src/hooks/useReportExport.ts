import { useCallback } from 'react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ExportData {
  events: Array<{
    created_at: string;
    ramp_name: string;
    event_type: string;
    from_status: string | null;
    to_status: string;
    slot_key: string;
  }>;
  metrics: {
    slaCompliance: number;
    avgResponseTime: number;
    overdueCount: number;
    resolvedCount: number;
    totalEvents: number;
  };
  unitName: string;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
}

const eventTypeLabels: Record<string, string> = {
  status_change: 'Mudança de Status',
  sla_overdue: 'SLA Excedido',
  acknowledge: 'Reconhecido',
  resolved: 'Resolvido',
  preparing: 'Em Preparo',
};

const statusLabels: Record<string, string> = {
  ok: 'OK',
  attention: 'Atenção',
  missing: 'Faltando',
  preparing: 'Preparando',
};

export function useReportExport() {
  const exportToExcel = useCallback(async (data: ExportData) => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema de Reposição';
      workbook.created = new Date();

      // Summary sheet
      const summarySheet = workbook.addWorksheet('Resumo');
      
      // Add summary data
      summarySheet.addRow(['Relatório de Reposição']);
      summarySheet.addRow([]);
      summarySheet.addRow(['Unidade:', data.unitName]);
      summarySheet.addRow(['Período:', data.periodLabel]);
      summarySheet.addRow(['Data de Geração:', format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })]);
      summarySheet.addRow([]);
      summarySheet.addRow(['Métricas']);
      summarySheet.addRow(['Conformidade SLA:', `${data.metrics.slaCompliance}%`]);
      summarySheet.addRow(['Tempo Médio de Resposta:', `${data.metrics.avgResponseTime} min`]);
      summarySheet.addRow(['SLA Excedidos:', data.metrics.overdueCount]);
      summarySheet.addRow(['Eventos Resolvidos:', data.metrics.resolvedCount]);
      summarySheet.addRow(['Total de Eventos:', data.metrics.totalEvents]);

      // Style the title
      const titleRow = summarySheet.getRow(1);
      titleRow.font = { bold: true, size: 14 };
      
      // Style metrics header
      const metricsRow = summarySheet.getRow(7);
      metricsRow.font = { bold: true };

      // Set column widths
      summarySheet.getColumn(1).width = 25;
      summarySheet.getColumn(2).width = 30;

      // Events sheet
      const eventsSheet = workbook.addWorksheet('Eventos');
      
      // Add header row
      const headerRow = eventsSheet.addRow(['Data/Hora', 'Rampa', 'Slot', 'Tipo de Evento', 'Status Anterior', 'Novo Status']);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' }
      };
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });

      // Add data rows
      data.events.forEach(event => {
        eventsSheet.addRow([
          format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
          event.ramp_name,
          event.slot_key,
          eventTypeLabels[event.event_type] || event.event_type,
          event.from_status ? (statusLabels[event.from_status] || event.from_status) : '-',
          statusLabels[event.to_status] || event.to_status,
        ]);
      });

      // Set column widths
      eventsSheet.getColumn(1).width = 20;
      eventsSheet.getColumn(2).width = 15;
      eventsSheet.getColumn(3).width = 15;
      eventsSheet.getColumn(4).width = 20;
      eventsSheet.getColumn(5).width = 15;
      eventsSheet.getColumn(6).width = 15;

      // Generate filename
      const filename = `relatorio_${data.unitName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      
      // Save file - create blob and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Erro ao exportar relatório Excel');
    }
  }, []);

  const exportToPDF = useCallback((data: ExportData) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Reposição', pageWidth / 2, 20, { align: 'center' });
      
      // Subheader
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(data.unitName, pageWidth / 2, 28, { align: 'center' });
      doc.setFontSize(10);
      doc.text(data.periodLabel, pageWidth / 2, 34, { align: 'center' });
      doc.text(
        `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        pageWidth / 2,
        40,
        { align: 'center' }
      );

      // Metrics table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Métricas do Período', 14, 55);

      autoTable(doc, {
        startY: 60,
        head: [['Métrica', 'Valor']],
        body: [
          ['Conformidade SLA', `${data.metrics.slaCompliance}%`],
          ['Tempo Médio de Resposta', `${data.metrics.avgResponseTime} min`],
          ['SLA Excedidos', data.metrics.overdueCount.toString()],
          ['Eventos Resolvidos', data.metrics.resolvedCount.toString()],
          ['Total de Eventos', data.metrics.totalEvents.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60 },
        },
      });

      // Events table
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico de Eventos', 14, finalY + 15);

      const eventsTableData = data.events.slice(0, 50).map(event => [
        format(new Date(event.created_at), 'dd/MM/yy HH:mm', { locale: ptBR }),
        event.ramp_name,
        eventTypeLabels[event.event_type] || event.event_type,
        statusLabels[event.to_status] || event.to_status,
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Data/Hora', 'Rampa', 'Tipo', 'Status']],
        body: eventsTableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 40 },
          2: { cellWidth: 50 },
          3: { cellWidth: 35 },
        },
      });

      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Generate filename
      const filename = `relatorio_${data.unitName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      
      // Save file
      doc.save(filename);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Erro ao exportar relatório PDF');
    }
  }, []);

  return { exportToExcel, exportToPDF };
}
