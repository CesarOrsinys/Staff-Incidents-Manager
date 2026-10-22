import * as XLSX from 'xlsx';
import { IExportService, MonthlyWorkerReportItem, ExportReportOptions } from '../../../core/ports/IExportService.js';

export class ExportService implements IExportService {
  generateExcel(data: MonthlyWorkerReportItem[], options: ExportReportOptions): Uint8Array {
    const wb = XLSX.utils.book_new();

    const monthsNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const monthName = monthsNames[(options.month || 10) - 1] || 'OCTUBRE';
    const centerTitle = `HORAS E INCIDENCIAS ${(options.workCenterName || 'EDIFICIO JUEZ BORRULL').toUpperCase()}`;

    // 1. Hoja Formato Oficial Físico (3 columnas exactas)
    const officialRows: any[] = [];
    // Fila 1: 2 columnas (primera ancho Trabajador, segunda ocupa 2 columnas)
    officialRows.push([monthName, centerTitle, '']);
    // Fila 2: Encabezados de columna
    officialRows.push(['TRABAJADOR/@', 'FECHA', 'INCIDENCIA Horas Extr / DC']);

    // Fila 3 en adelante: Datos de trabajadores con incidencias o ausencias
    for (const item of data) {
      const workerName = item.worker.name.toUpperCase();
      if (!item.incidents || item.incidents.length === 0) {
        if (item.absentDates && item.absentDates.length > 0) {
          for (const abs of item.absentDates) {
            const parts = abs.date.split('-');
            const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : abs.date;
            officialRows.push([workerName, formattedDate, abs.substitutedBy ? `Suplido/a por ${abs.substitutedBy}` : abs.reason]);
          }
        }
      } else {
        item.incidents.forEach((inc, idx) => {
          let dateStr = inc.startDate;
          if (inc.isRange && inc.endDate && inc.endDate !== inc.startDate) {
            dateStr = `${inc.startDate.slice(8)} al ${inc.endDate.slice(8)}/${inc.startDate.slice(5, 7)}/${inc.startDate.slice(2, 4)}`;
          } else if (inc.startDate) {
            const parts = inc.startDate.split('-');
            dateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : inc.startDate;
          }

          let desc = inc.observations || '';
          if (!desc) {
            if (inc.startTime && inc.endTime) {
              desc = `${inc.startTime}-${inc.endTime}`;
              if (inc.substitutedWorkerId) desc += ` Por compañero`;
            } else {
              desc = inc.type;
            }
          }
          officialRows.push([idx === 0 ? workerName : '', dateStr, desc]);
        });
      }
    }

    const wsOfficial = XLSX.utils.aoa_to_sheet(officialRows);
    wsOfficial['!merges'] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } } // Merge row 1, col 2 and 3
    ];
    wsOfficial['!cols'] = [
      { wch: 30 },
      { wch: 22 },
      { wch: 45 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOfficial, 'Parte Oficial');

    // 2. Hoja Resumen Métrico
    const summaryRows: any[] = [];
    summaryRows.push(['PARTE MENSUAL DE HORAS E INCIDENCIAS DE PERSONAL']);
    summaryRows.push([`Centro: ${options.workCenterName || 'Edificio Juez Borrull'}`, `Periodo: ${options.month}/${options.year}`]);
    summaryRows.push([`Generado por: ${options.generatedBy || 'Gerencia'}`, `Fecha: ${new Date().toLocaleDateString()}`]);
    summaryRows.push([]);
    summaryRows.push([
      'Trabajador',
      'Contrato',
      'Horas Extra Ganadas',
      'Horas a Deber',
      'Balance Neto',
      'Días Vacaciones',
      'Días Asuntos Propios',
      'Días Baja/Fallecimiento'
    ]);

    for (const item of data) {
      summaryRows.push([
        item.worker.name,
        item.worker.contractStatus,
        (item.totalSubstitutionHours || 0) + (item.totalOvertimeHours || 0),
        item.owedHours || 0,
        item.netHours || 0,
        item.vacationDaysCount,
        item.personalMattersDaysCount,
        item.leaveDaysCount
      ]);
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Metrico');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new Uint8Array(buffer);
  }

  async generatePdfData(data: MonthlyWorkerReportItem[], options: ExportReportOptions): Promise<Uint8Array | Blob | string> {
    const { jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = (autoTableModule as any).default || autoTableModule;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const monthsNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const monthName = monthsNames[(options.month || 10) - 1] || 'OCTUBRE';
    const centerTitle = `HORAS E INCIDENCIAS ${(options.workCenterName || 'EDIFICIO JUEZ BORRULL').toUpperCase()}`;

    // Estructura oficial del encabezado físico:
    // Fila 1: 2 columnas (OCTUBRE | HORAS E INCIDENCIAS ...)
    // Fila 2: 3 columnas (TRABAJADOR/@ | FECHA | INCIDENCIA Horas Extr / DC)
    const head = [
      [
        { content: monthName, styles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 } },
        { content: centerTitle, colSpan: 2, styles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold', fontSize: 11 } }
      ],
      [
        { content: 'TRABAJADOR/@', styles: { fillColor: [56, 142, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 } },
        { content: 'FECHA', styles: { fillColor: [56, 142, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 } },
        { content: 'INCIDENCIA Horas Extr / DC', styles: { fillColor: [56, 142, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 } }
      ]
    ];

    const body: any[] = [];

    for (const item of data) {
      const workerName = item.worker.name.toUpperCase();
      if (!item.incidents || item.incidents.length === 0) {
        if (item.absentDates && item.absentDates.length > 0) {
          for (const abs of item.absentDates) {
            const parts = abs.date.split('-');
            const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : abs.date;
            body.push([
              { content: workerName, styles: { fontStyle: 'bold' } },
              formattedDate,
              abs.substitutedBy ? `Suplido/a por ${abs.substitutedBy}` : abs.reason
            ]);
          }
        }
      } else {
        item.incidents.forEach((inc, idx) => {
          let dateStr = inc.startDate;
          if (inc.isRange && inc.endDate && inc.endDate !== inc.startDate) {
            dateStr = `${inc.startDate.slice(8)} al ${inc.endDate.slice(8)}/${inc.startDate.slice(5, 7)}/${inc.startDate.slice(2, 4)}`;
          } else if (inc.startDate) {
            const parts = inc.startDate.split('-');
            dateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : inc.startDate;
          }

          let desc = inc.observations || '';
          if (!desc) {
            if (inc.startTime && inc.endTime) {
              desc = `${inc.startTime}-${inc.endTime}`;
              if (inc.substitutedWorkerId) desc += ` Por suplencia`;
            } else {
              desc = inc.type;
            }
          }

          body.push([
            { content: idx === 0 ? workerName : '', styles: { fontStyle: 'bold' } },
            dateStr,
            desc
          ]);
        });
      }
    }

    const tableConfig = {
      startY: 12,
      margin: { left: 15, right: 15 },
      head: head,
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [180, 190, 200],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { cellWidth: 95 }
      }
    };

    if (typeof autoTable === 'function') {
      autoTable(doc, tableConfig);
    } else if (typeof (doc as any).autoTable === 'function') {
      (doc as any).autoTable(tableConfig);
    }

    const outputBuffer = doc.output('arraybuffer');
    return new Uint8Array(outputBuffer);
  }
}
