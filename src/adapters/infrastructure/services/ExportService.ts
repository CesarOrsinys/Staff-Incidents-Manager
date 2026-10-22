import XLSX_LIB from 'xlsx-js-style';
const XLSX: any = (XLSX_LIB as any)?.default || XLSX_LIB;
import { IExportService, MonthlyWorkerReportItem, ExportReportOptions } from '../../../core/ports/IExportService.js';

export class ExportService implements IExportService {
  generateExcel(data: MonthlyWorkerReportItem[], options: ExportReportOptions): Uint8Array {
    const wb = XLSX.utils.book_new();

    const monthsNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const monthName = monthsNames[(options.month || 10) - 1] || 'OCTUBRE';
    const centerTitle = `HORAS E INCIDENCIAS ${(options.workCenterName || 'EDIFICIO JUEZ BORRULL').toUpperCase()}`;

    // Paleta de colores oficial que replica exactamente el PDF ("el verde ese")
    const COLOR_GREEN_DARK = '2E7D32';    // #2E7D32 (46, 125, 50 del PDF)
    const COLOR_GREEN_MEDIUM = '388E3C';  // #388E3C (56, 142, 60 del PDF)
    const COLOR_GREEN_LIGHT = 'E8F5E9';   // #E8F5E9 verde suave para metadatos
    const COLOR_BORDER_DARK = '1B5E20';
    const COLOR_BORDER_LIGHT = 'CBD5E1';
    const COLOR_ROW_ALT = 'F8FAF8';
    const COLOR_WHITE = 'FFFFFF';
    const COLOR_TEXT_DARK = '0F172A';
    const COLOR_TEXT_MUTED = '334155';

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
      { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } } // Merge fila 1, col 2 y 3
    ];
    wsOfficial['!cols'] = [
      { wch: 34 },
      { wch: 22 },
      { wch: 55 }
    ];

    const officialRowHeights: any[] = [{ hpt: 30 }, { hpt: 26 }];
    for (let i = 2; i < officialRows.length; i++) {
      officialRowHeights.push({ hpt: 22 });
    }
    wsOfficial['!rows'] = officialRowHeights;

    // Aplicar estilos a la Hoja Oficial
    // Fila 0 (Título y Centro)
    const styleTitle = {
      fill: { fgColor: { rgb: COLOR_GREEN_DARK } },
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: COLOR_WHITE } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: COLOR_BORDER_DARK } },
        bottom: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } },
        left: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } },
        right: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } }
      }
    };

    ['A1', 'B1', 'C1'].forEach(cell => {
      if (!wsOfficial[cell]) wsOfficial[cell] = { t: 's', v: '' };
      wsOfficial[cell].s = styleTitle;
    });

    // Fila 1 (Encabezados de columna)
    const styleHeaderCol0 = {
      fill: { fgColor: { rgb: COLOR_GREEN_MEDIUM } },
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLOR_WHITE } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } },
        bottom: { style: 'medium', color: { rgb: COLOR_BORDER_DARK } },
        left: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } },
        right: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } }
      }
    };
    const styleHeaderCol1 = {
      ...styleHeaderCol0,
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const styleHeaderCol2 = {
      ...styleHeaderCol0,
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    if (wsOfficial['A2']) wsOfficial['A2'].s = styleHeaderCol0;
    if (wsOfficial['B2']) wsOfficial['B2'].s = styleHeaderCol1;
    if (wsOfficial['C2']) wsOfficial['C2'].s = styleHeaderCol2;

    // Filas de datos (fila 2 a N)
    for (let r = 2; r < officialRows.length; r++) {
      const isAlt = r % 2 !== 0;
      const rowBg = isAlt ? COLOR_ROW_ALT : COLOR_WHITE;

      for (let c = 0; c < 3; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!wsOfficial[cellRef]) wsOfficial[cellRef] = { t: 's', v: '' };

        const val = wsOfficial[cellRef].v || '';
        const isWorkerCol = c === 0;
        const isDateCol = c === 1;

        wsOfficial[cellRef].s = {
          fill: { fgColor: { rgb: rowBg } },
          font: {
            name: 'Calibri',
            sz: 10,
            bold: isWorkerCol && Boolean(val),
            color: { rgb: isWorkerCol ? COLOR_TEXT_DARK : COLOR_TEXT_MUTED }
          },
          alignment: {
            horizontal: isDateCol ? 'center' : 'left',
            vertical: 'center',
            wrapText: c === 2
          },
          border: {
            top: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
            bottom: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
            left: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
            right: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } }
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, wsOfficial, 'Parte Oficial');

    // 2. Hoja Resumen Métrico
    const summaryRows: any[] = [];
    summaryRows.push(['PARTE MENSUAL DE HORAS E INCIDENCIAS DE PERSONAL', '', '', '', '', '', '', '']);
    summaryRows.push([`Centro: ${options.workCenterName || 'Edificio Juez Borrull'}`, '', `Periodo: ${options.month}/${options.year}`, '', '', '', '', '']);
    summaryRows.push([`Generado por: ${options.generatedBy || 'Gerencia'}`, '', `Fecha: ${new Date().toLocaleDateString()}`, '', '', '', '', '']);
    summaryRows.push(['', '', '', '', '', '', '', '']);
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
    wsSummary['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 1, c: 2 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 2, c: 7 } }
    ];
    wsSummary['!cols'] = [
      { wch: 32 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 24 }
    ];

    const summaryRowHeights: any[] = [
      { hpt: 30 },
      { hpt: 22 },
      { hpt: 22 },
      { hpt: 12 },
      { hpt: 26 }
    ];
    for (let i = 5; i < summaryRows.length; i++) {
      summaryRowHeights.push({ hpt: 22 });
    }
    wsSummary['!rows'] = summaryRowHeights;

    // Estilos Resumen Métrico
    // Banner Título (Fila 0)
    for (let c = 0; c < 8; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (!wsSummary[cellRef]) wsSummary[cellRef] = { t: 's', v: '' };
      wsSummary[cellRef].s = {
        fill: { fgColor: { rgb: COLOR_GREEN_DARK } },
        font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: COLOR_WHITE } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: COLOR_BORDER_DARK } },
          bottom: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } },
          left: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } },
          right: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } }
        }
      };
    }

    // Metadatos (Filas 1 y 2)
    for (let r = 1; r <= 2; r++) {
      for (let c = 0; c < 8; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!wsSummary[cellRef]) wsSummary[cellRef] = { t: 's', v: '' };
        wsSummary[cellRef].s = {
          fill: { fgColor: { rgb: COLOR_GREEN_LIGHT } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLOR_BORDER_DARK } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'C8E6C9' } },
            bottom: { style: 'thin', color: { rgb: 'C8E6C9' } },
            left: { style: 'thin', color: { rgb: 'C8E6C9' } },
            right: { style: 'thin', color: { rgb: 'C8E6C9' } }
          }
        };
      }
    }

    // Encabezados de tabla de métricas (Fila 4)
    for (let c = 0; c < 8; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 4, c });
      if (!wsSummary[cellRef]) wsSummary[cellRef] = { t: 's', v: '' };
      wsSummary[cellRef].s = {
        fill: { fgColor: { rgb: COLOR_GREEN_MEDIUM } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLOR_WHITE } },
        alignment: { horizontal: c <= 1 ? 'left' : 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } },
          bottom: { style: 'medium', color: { rgb: COLOR_BORDER_DARK } },
          left: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } },
          right: { style: 'thin', color: { rgb: COLOR_BORDER_DARK } }
        }
      };
    }

    // Filas de datos métricos (Fila 5 en adelante)
    for (let r = 5; r < summaryRows.length; r++) {
      const isAlt = r % 2 !== 0;
      const rowBg = isAlt ? COLOR_ROW_ALT : COLOR_WHITE;

      for (let c = 0; c < 8; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!wsSummary[cellRef]) wsSummary[cellRef] = { t: 's', v: '' };

        wsSummary[cellRef].s = {
          fill: { fgColor: { rgb: rowBg } },
          font: {
            name: 'Calibri',
            sz: 10,
            bold: c === 0,
            color: { rgb: c === 0 ? COLOR_TEXT_DARK : COLOR_TEXT_MUTED }
          },
          alignment: {
            horizontal: c === 0 ? 'left' : 'center',
            vertical: 'center'
          },
          border: {
            top: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
            bottom: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
            left: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } },
            right: { style: 'thin', color: { rgb: COLOR_BORDER_LIGHT } }
          }
        };
      }
    }

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
