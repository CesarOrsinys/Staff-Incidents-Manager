import * as XLSX from 'xlsx';
import { IExportService, MonthlyWorkerReportItem, ExportReportOptions } from '../../../core/ports/IExportService.js';

export class ExportService implements IExportService {
  generateExcel(data: MonthlyWorkerReportItem[], options: ExportReportOptions): Uint8Array {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryRows: any[] = [];
    summaryRows.push(['PARTE MENSUAL DE HORAS E INCIDENCIAS DE PERSONAL']);
    summaryRows.push([`Centro: ${options.workCenterName || 'Todos los Centros'}`, `Periodo: ${options.month}/${options.year}`]);
    summaryRows.push([`Generado por: ${options.generatedBy || 'Gerencia'}`, `Fecha: ${new Date().toLocaleDateString()}`]);
    summaryRows.push([]); // empty line

    summaryRows.push([
      'Trabajador',
      'DNI/NIE',
      'Contrato',
      'Centro de Trabajo',
      'Horas Extra',
      'Horas Sustitución',
      'Días Vacaciones',
      'Días Asuntos Propios',
      'Días Baja/Fallecimiento',
      'Total Registros'
    ]);

    for (const item of data) {
      summaryRows.push([
        item.worker.name,
        item.worker.documentId || '-',
        item.worker.contractStatus,
        item.workCenter?.name || '-',
        item.totalOvertimeHours,
        item.totalSubstitutionHours,
        item.vacationDaysCount,
        item.personalMattersDaysCount,
        item.leaveDaysCount,
        item.incidents.length
      ]);
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Mensual');

    // Detail Sheet
    const detailRows: any[] = [];
    detailRows.push([
      'ID Incidencia',
      'Trabajador',
      'Tipo de Registro',
      'Fecha Inicio',
      'Fecha Fin',
      'Horario',
      'Horas',
      'Trabajador Sustituido',
      'Observaciones'
    ]);

    for (const item of data) {
      for (const inc of item.incidents) {
        const schedule = inc.startTime && inc.endTime ? `${inc.startTime} - ${inc.endTime}` : '-';
        detailRows.push([
          inc.id,
          item.worker.name,
          inc.type,
          inc.startDate,
          inc.endDate,
          schedule,
          inc.totalHours || '-',
          inc.substitutedWorkerId || '-',
          inc.observations || '-'
        ]);
      }
    }

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Incidencias');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new Uint8Array(buffer);
  }

  async generatePdfData(data: MonthlyWorkerReportItem[], options: ExportReportOptions): Promise<Uint8Array | Blob | string> {
    const { jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = (autoTableModule as any).default || autoTableModule;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header styling
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('PARTE DE HORAS E INCIDENCIAS', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Centro: ${options.workCenterName || 'Todos'} | Mes: ${options.month}/${options.year} | Generado por: ${options.generatedBy || 'Gerencia'} | Fecha: ${new Date().toLocaleDateString()}`, 14, 25);

    const head = [[
      'Trabajador',
      'Contrato',
      'Centro',
      'H. Extra',
      'H. Sustitución',
      'Vacaciones (D)',
      'Asuntos P. (D)',
      'Baja/Fall. (D)',
      'Incidencias Registradas'
    ]];

    const body = data.map(item => {
      const incDescriptions = item.incidents.map(i => {
        let desc = `${i.type} (${i.startDate}${i.isRange ? ' al ' + i.endDate : ''})`;
        if (i.startTime && i.endTime) desc += ` [${i.startTime}-${i.endTime} = ${i.totalHours}h]`;
        if (i.substitutedWorkerId) desc += ` (Sustituye: ${i.substitutedWorkerId})`;
        return desc;
      }).join('; ');

      return [
        item.worker.name,
        item.worker.contractStatus,
        item.workCenter?.name || '-',
        item.totalOvertimeHours > 0 ? `${item.totalOvertimeHours} h` : '0',
        item.totalSubstitutionHours > 0 ? `${item.totalSubstitutionHours} h` : '0',
        item.vacationDaysCount,
        item.personalMattersDaysCount,
        item.leaveDaysCount,
        incDescriptions || 'Sin incidencias'
      ];
    });

    if (typeof autoTable === 'function') {
      autoTable(doc, {
        startY: 30,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          8: { cellWidth: 80 }
        }
      });
    } else if (typeof (doc as any).autoTable === 'function') {
      (doc as any).autoTable({
        startY: 30,
        head: head,
        body: body,
        theme: 'grid'
      });
    }

    const outputBuffer = doc.output('arraybuffer');
    return new Uint8Array(outputBuffer);
  }
}
