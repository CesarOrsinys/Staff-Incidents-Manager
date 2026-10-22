import { AppState } from '../state/AppState.js';
import { MonthlyWorkerReportItem } from '../../core/ports/IExportService.js';
import { IncidentType } from '../../core/domain/enums/IncidentType.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';

import { MasterDataComponent } from './MasterDataComponent.js';

export class MonthlyReportComponent {
  private static currentFilter: 'all' | 'owed' | 'overtime' = 'all';

  public static init(): void {
    this.setupListeners();
  }

  public static async populateFilters(): Promise<void> {
    await MasterDataComponent.ensureCentersLoaded();
    const filterCenter = document.getElementById('report-work-center') as HTMLSelectElement;
    if (filterCenter) {
      filterCenter.innerHTML = AppState.workCenters.map(c => `
        <option value="${c.id}" ${c.id === 'wc_borrull' || c.code === 'BOR-001' ? 'selected' : ''}>
          ${c.name}
        </option>
      `).join('');
      if (!filterCenter.value && AppState.workCenters.length > 0) {
        filterCenter.value = AppState.workCenters[0].id;
      }
    }

    const filterMonth = document.getElementById('report-month') as HTMLSelectElement;
    const filterYear = document.getElementById('report-year') as HTMLInputElement;

    if (filterMonth) filterMonth.value = String(AppState.selectedMonth);
    if (filterYear) filterYear.value = String(AppState.selectedYear);
  }

  public static async loadReport(): Promise<void> {
    if (!AppState.currentUser) return;
    await this.populateFilters();

    const filterCenter = (document.getElementById('report-work-center') as HTMLSelectElement)?.value || 'wc_borrull';
    const filterMonth = (document.getElementById('report-month') as HTMLSelectElement)?.value || String(AppState.selectedMonth);
    const filterYear = (document.getElementById('report-year') as HTMLInputElement)?.value || String(AppState.selectedYear);

    await withLoader(async () => {
      try {
        const query = new URLSearchParams({
          month: filterMonth,
          year: filterYear
        });
        if (filterCenter) query.append('workCenterId', filterCenter);

        const headers: Record<string, string> = {};
        if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;

        const res = await fetch(`/api/reports/monthly?${query.toString()}`, { headers });
        if (!res.ok) throw new Error('Error al cargar informe');
        const data: MonthlyWorkerReportItem[] = await res.json();

        AppState.monthlyReport = data;
        this.renderMetrics(data);
        this.renderOfficialTable(data);
      } catch (err: any) {
        showToast(err.message || 'Error al obtener informe', 'danger');
      }
    }, 'Cargando partes e informe...');
  }

  public static setFilter(filter: 'all' | 'owed' | 'overtime'): void {
    this.currentFilter = filter;
    const btnAll = document.getElementById('filter-btn-all');
    const btnOwed = document.getElementById('filter-btn-owed');
    const btnOvertime = document.getElementById('filter-btn-overtime');

    btnAll?.classList.toggle('active', filter === 'all');
    btnOwed?.classList.toggle('active', filter === 'owed');
    btnOvertime?.classList.toggle('active', filter === 'overtime');

    this.renderOfficialTable(AppState.monthlyReport);
  }

  private static renderMetrics(data: MonthlyWorkerReportItem[]): void {
    let totalOvertimeHours = 0;
    let totalOwedHours = 0;
    let staffOwingCount = 0;
    let staffOvertimeCount = 0;

    for (const item of data) {
      const earned = (item.totalSubstitutionHours || 0) + (item.totalOvertimeHours || 0);
      const owed = item.owedHours || 0;

      totalOvertimeHours += earned;
      totalOwedHours += owed;

      if (owed > 0 || (item.absentDates && item.absentDates.length > 0)) {
        staffOwingCount++;
      }
      if (earned > 0) {
        staffOvertimeCount++;
      }
    }

    const badgeOwed = document.getElementById('metric-owed-summary');
    const badgeOvertime = document.getElementById('metric-overtime-summary');
    if (badgeOwed) {
      badgeOwed.textContent = `${totalOwedHours.toFixed(1)} h a deber (${staffOwingCount} personas)`;
    }
    if (badgeOvertime) {
      badgeOvertime.textContent = `${totalOvertimeHours.toFixed(1)} h extras (${staffOvertimeCount} personas)`;
    }
  }

  public static renderOfficialTable(data: MonthlyWorkerReportItem[]): void {
    const tbody = document.getElementById('official-sheet-tbody');
    const titleCenterEl = document.getElementById('sheet-header-center-title');
    const monthEl = document.getElementById('sheet-header-month');
    if (!tbody) return;

    const filterMonth = Number((document.getElementById('report-month') as HTMLSelectElement)?.value || AppState.selectedMonth);
    const monthsNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const monthName = monthsNames[filterMonth - 1] || 'OCTUBRE';

    const selectedCenterId = (document.getElementById('report-work-center') as HTMLSelectElement)?.value || 'wc_borrull';
    const centerObj = AppState.workCenters.find(c => c.id === selectedCenterId);
    const centerName = centerObj ? centerObj.name.toUpperCase() : 'EDIFICIO JUEZ BORRULL';

    if (monthEl) monthEl.textContent = monthName;
    if (titleCenterEl) titleCenterEl.textContent = `HORAS E INCIDENCIAS ${centerName}`;

    // Apply active filter
    let filteredData = [...data];
    if (this.currentFilter === 'owed') {
      filteredData = filteredData.filter(item => 
        (item.owedHours && item.owedHours > 0) || 
        (item.absentDates && item.absentDates.length > 0) ||
        item.vacationDaysCount > 0 ||
        item.personalMattersDaysCount > 0 ||
        item.leaveDaysCount > 0
      );
    } else if (this.currentFilter === 'overtime') {
      filteredData = filteredData.filter(item => 
        ((item.totalSubstitutionHours || 0) + (item.totalOvertimeHours || 0)) > 0
      );
    }

    let rowsHtml = '';

    for (const item of filteredData) {
      const workerName = item.worker.name.toUpperCase();
      const incidents = item.incidents || [];

      // Determine lines to render for this worker
      if (incidents.length === 0) {
        // If owed filter is active and worker has absences due to substitution
        if (item.absentDates && item.absentDates.length > 0) {
          for (const abs of item.absentDates) {
            const desc = abs.substitutedBy ? `Suplido/a por ${abs.substitutedBy}` : abs.reason;
            rowsHtml += `
              <tr class="sheet-data-row">
                <td class="col-worker font-bold">${workerName}</td>
                <td class="col-date">${abs.date}</td>
                <td class="col-incident text-rose">${desc}</td>
              </tr>
            `;
          }
        } else {
          // Empty line with worker name (like Rafael Arismendi on physical paper)
          rowsHtml += `
            <tr class="sheet-data-row">
              <td class="col-worker font-bold">${workerName}</td>
              <td class="col-date"></td>
              <td class="col-incident"></td>
            </tr>
          `;
        }
      } else {
        // Render each incident row
        incidents.forEach((inc, idx) => {
          let dateStr = inc.startDate;
          if (inc.isRange && inc.endDate && inc.endDate !== inc.startDate) {
            dateStr = `${inc.startDate.slice(8)} al ${inc.endDate.slice(8)}/${inc.startDate.slice(5, 7)}/${inc.startDate.slice(2, 4)}`;
          } else if (inc.startDate) {
            const parts = inc.startDate.split('-');
            dateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : inc.startDate;
          }

          let incDesc = inc.observations || '';
          if (!incDesc) {
            if (inc.type === IncidentType.SUBSTITUTION) {
              const subbed = AppState.workers.find(w => w.id === inc.substitutedWorkerId);
              const subName = subbed ? subbed.name.split(' ')[0] : 'Compañero';
              incDesc = `${inc.startTime || ''}-${inc.endTime || ''} Por ${subName}.`;
            } else if (inc.type === IncidentType.VACATION) {
              incDesc = 'Vacaciones';
            } else if (inc.type === IncidentType.PERSONAL_MATTERS) {
              incDesc = 'Asuntos propios';
            } else if (inc.type === IncidentType.LEAVE_OR_DEATH) {
              incDesc = 'Baja médica / Permiso';
            } else if (inc.type === IncidentType.CONTRACT_END) {
              incDesc = `Término de contrato ${dateStr}`;
            }
          }

          rowsHtml += `
            <tr class="sheet-data-row">
              <td class="col-worker font-bold">${idx === 0 ? workerName : ''}</td>
              <td class="col-date">${dateStr}</td>
              <td class="col-incident">
                <span class="incident-entry-text">${incDesc}</span>
                <button class="btn-delete-row no-print" data-id="${inc.id}" title="Eliminar registro">✕</button>
              </td>
            </tr>
          `;
        });
      }
    }

    // Add blank lines at the bottom for manual entries (as requested by user)
    const blankRowsCount = 8;
    for (let i = 0; i < blankRowsCount; i++) {
      rowsHtml += `
        <tr class="sheet-data-row sheet-blank-row">
          <td class="col-worker">&nbsp;</td>
          <td class="col-date">&nbsp;</td>
          <td class="col-incident">&nbsp;</td>
        </tr>
      `;
    }

    tbody.innerHTML = rowsHtml;
  }

  private static setupListeners(): void {
    const filterCenter = document.getElementById('report-work-center');
    const filterMonth = document.getElementById('report-month');
    const filterYear = document.getElementById('report-year');
    const btnAll = document.getElementById('filter-btn-all');
    const btnOwed = document.getElementById('filter-btn-owed');
    const btnOvertime = document.getElementById('filter-btn-overtime');
    const btnPrint = document.getElementById('btn-print-sheet');
    const btnExcel = document.getElementById('btn-download-excel');
    const btnPdf = document.getElementById('btn-download-pdf');

    filterCenter?.addEventListener('change', () => this.loadReport());
    filterMonth?.addEventListener('change', () => this.loadReport());
    filterYear?.addEventListener('change', () => this.loadReport());

    btnAll?.addEventListener('click', () => this.setFilter('all'));
    btnOwed?.addEventListener('click', () => this.setFilter('owed'));
    btnOvertime?.addEventListener('click', () => this.setFilter('overtime'));

    btnPrint?.addEventListener('click', () => window.print());
    btnExcel?.addEventListener('click', () => this.exportExcel());
    btnPdf?.addEventListener('click', () => this.exportPdf());

    // Delegated incident deletion
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('btn-delete-row')) {
        const id = target.getAttribute('data-id');
        if (!id) return;
        if (!confirm('¿Eliminar este registro del parte?')) return;

        await withLoader(async () => {
          const headers: Record<string, string> = {};
          if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
          const res = await fetch(`/api/incidents/${id}`, { method: 'DELETE', headers });
          if (res.ok) {
            showToast('Registro eliminado', 'info');
            this.loadReport();
            document.dispatchEvent(new CustomEvent('app:incident-deleted'));
          }
        }, 'Eliminando registro...');
      }
    });
  }

  public static async exportExcel(): Promise<void> {
    const filterCenter = (document.getElementById('report-work-center') as HTMLSelectElement)?.value || 'wc_borrull';
    const filterMonth = (document.getElementById('report-month') as HTMLSelectElement)?.value || String(AppState.selectedMonth);
    const filterYear = (document.getElementById('report-year') as HTMLInputElement)?.value || String(AppState.selectedYear);

    await withLoader(async () => {
      try {
        const query = new URLSearchParams({
          month: filterMonth,
          year: filterYear,
          workCenterId: filterCenter
        });

        const headers: Record<string, string> = {};
        if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;

        const res = await fetch(`/api/reports/export/excel?${query.toString()}`, { headers });
        if (!res.ok) throw new Error('Error al generar Excel');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Parte_Horas_Incidencias_${filterYear}_${String(filterMonth).padStart(2, '0')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('Archivo Excel descargado con éxito', 'success');
      } catch (err: any) {
        showToast(err.message || 'Error al exportar Excel', 'danger');
      }
    }, 'Generando libro Excel...');
  }

  public static async exportPdf(): Promise<void> {
    const filterCenter = (document.getElementById('report-work-center') as HTMLSelectElement)?.value || 'wc_borrull';
    const filterMonth = (document.getElementById('report-month') as HTMLSelectElement)?.value || String(AppState.selectedMonth);
    const filterYear = (document.getElementById('report-year') as HTMLInputElement)?.value || String(AppState.selectedYear);

    await withLoader(async () => {
      try {
        const query = new URLSearchParams({
          month: filterMonth,
          year: filterYear,
          workCenterId: filterCenter
        });

        const headers: Record<string, string> = {};
        if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;

        const res = await fetch(`/api/reports/export/pdf?${query.toString()}`, { headers });
        if (!res.ok) throw new Error('Error al generar PDF');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Parte_Horas_Incidencias_${filterYear}_${String(filterMonth).padStart(2, '0')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('Documento PDF descargado con éxito', 'success');
      } catch (err: any) {
        showToast(err.message || 'Error al exportar PDF', 'danger');
      }
    }, 'Generando documento PDF...');
  }
}
