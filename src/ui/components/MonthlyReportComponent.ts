import { AppState } from '../state/AppState.js';
import { MonthlyWorkerReportItem } from '../../core/ports/IExportService.js';
import { IncidentType } from '../../core/domain/enums/IncidentType.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';

export class MonthlyReportComponent {
  public static init(): void {
    this.populateFilters();
    this.setupListeners();
    this.loadReport();
  }

  public static populateFilters(): void {
    const filterCenter = document.getElementById('filter-work-center') as HTMLSelectElement;
    if (filterCenter) {
      filterCenter.innerHTML = '<option value="">Todos los Centros</option>' +
        AppState.workCenters.map(c => `
          <option value="${c.id}" ${c.id === AppState.selectedWorkCenterId ? 'selected' : ''}>${c.name}</option>
        `).join('');
    }

    const filterMonth = document.getElementById('filter-month') as HTMLSelectElement;
    const filterYear = document.getElementById('filter-year') as HTMLInputElement;

    if (filterMonth) filterMonth.value = String(AppState.selectedMonth);
    if (filterYear) filterYear.value = String(AppState.selectedYear);
  }

  public static async loadReport(): Promise<void> {
    const filterCenter = (document.getElementById('filter-work-center') as HTMLSelectElement)?.value || '';
    const filterMonth = (document.getElementById('filter-month') as HTMLSelectElement)?.value || String(AppState.selectedMonth);
    const filterYear = (document.getElementById('filter-year') as HTMLInputElement)?.value || String(AppState.selectedYear);
    const searchWorker = (document.getElementById('filter-search-worker') as HTMLInputElement)?.value.trim().toLowerCase() || '';
    const filterType = (document.getElementById('filter-type') as HTMLSelectElement)?.value || '';

    await withLoader(async () => {
      try {
        const query = new URLSearchParams({
          month: filterMonth,
          year: filterYear
        });
        if (filterCenter) query.append('workCenterId', filterCenter);

        const res = await fetch(`/api/reports/monthly?${query.toString()}`);
        if (!res.ok) throw new Error('Error al cargar informe');
        let data: MonthlyWorkerReportItem[] = await res.json();

        // Local filtering by search and type
        if (searchWorker) {
          data = data.filter(item => 
            item.worker.name.toLowerCase().includes(searchWorker) ||
            (item.worker.documentId && item.worker.documentId.toLowerCase().includes(searchWorker))
          );
        }

        if (filterType) {
          data = data.filter(item => item.incidents.some(inc => inc.type === filterType));
        }

        AppState.monthlyReport = data;
        this.renderMetrics(data);
        this.renderTable(data);
      } catch (err: any) {
        showToast(err.message || 'Error al obtener informe', 'danger');
      }
    }, 'Cargando informe mensual...');
  }

  public static renderMetrics(data: MonthlyWorkerReportItem[]): void {
    let totalOvertime = 0;
    let totalSubstitution = 0;
    let totalVacations = 0;
    let totalPersonal = 0;
    let totalLeave = 0;
    let activeWorkersCount = 0;

    for (const item of data) {
      totalOvertime += item.totalOvertimeHours;
      totalSubstitution += item.totalSubstitutionHours;
      totalVacations += item.vacationDaysCount;
      totalPersonal += item.personalMattersDaysCount;
      totalLeave += item.leaveDaysCount;
      if (item.incidents.length > 0) activeWorkersCount++;
    }

    const elOvertime = document.getElementById('metric-overtime');
    const elSubs = document.getElementById('metric-subs');
    const elVacations = document.getElementById('metric-vacations');
    const elPersonal = document.getElementById('metric-personal');
    const elLeave = document.getElementById('metric-leave');
    const elActiveWorkers = document.getElementById('metric-workers');

    if (elOvertime) elOvertime.textContent = `${totalOvertime.toFixed(1)} h`;
    if (elSubs) elSubs.textContent = `${totalSubstitution.toFixed(1)} h`;
    if (elVacations) elVacations.textContent = `${totalVacations} d`;
    if (elPersonal) elPersonal.textContent = `${totalPersonal} d`;
    if (elLeave) elLeave.textContent = `${totalLeave} d`;
    if (elActiveWorkers) elActiveWorkers.textContent = String(activeWorkersCount);
  }

  public static renderTable(data: MonthlyWorkerReportItem[]): void {
    const tbody = document.getElementById('report-tbody');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-6 text-muted">
            ${LanguageManager.t('txtNoIncidents')}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(item => {
      const incidentsListHtml = item.incidents.length > 0 
        ? item.incidents.map(inc => {
            const badgeClass = this.getTypeBadgeClass(inc.type);
            const typeLabel = LanguageManager.t(`type_${inc.type}`) || inc.type;
            const dates = inc.isRange ? `${inc.startDate} al ${inc.endDate}` : inc.startDate;
            const schedule = (inc.startTime && inc.endTime) ? ` [${inc.startTime} - ${inc.endTime} · ${inc.totalHours}h]` : '';
            const sub = inc.substitutedWorkerId ? ` ➔ Cubre a: <strong>${this.getWorkerName(inc.substitutedWorkerId)}</strong>` : '';
            const obs = inc.observations ? ` <span class="text-dim">("${inc.observations}")</span>` : '';

            return `
              <div class="incident-pill-row">
                <span class="badge ${badgeClass}">${typeLabel}</span>
                <span class="incident-desc">${dates}${schedule}${sub}${obs}</span>
                <button class="btn-xs-danger btn-delete-incident" data-id="${inc.id}" title="Eliminar registro">✕</button>
              </div>
            `;
          }).join('')
        : `<span class="text-muted text-xs">Sin incidencias este mes</span>`;

      return `
        <tr class="report-worker-row">
          <td>
            <div class="font-bold text-main">${item.worker.name}</div>
            <div class="text-xs text-muted">${item.worker.documentId || 'Sin DNI'} · ${item.worker.contractStatus}</div>
          </td>
          <td>
            <span class="badge badge-subtle">${item.workCenter ? item.workCenter.name : '-'}</span>
          </td>
          <td class="text-center font-bold text-amber">
            ${item.totalOvertimeHours > 0 ? `${item.totalOvertimeHours} h` : '-'}
          </td>
          <td class="text-center font-bold text-blue">
            ${item.totalSubstitutionHours > 0 ? `${item.totalSubstitutionHours} h` : '-'}
          </td>
          <td class="text-center">
            ${item.vacationDaysCount > 0 ? `<span class="badge badge-emerald">${item.vacationDaysCount} d</span>` : '-'}
          </td>
          <td class="text-center">
            ${item.personalMattersDaysCount > 0 ? `<span class="badge badge-purple">${item.personalMattersDaysCount} d</span>` : '-'}
          </td>
          <td class="text-center">
            ${item.leaveDaysCount > 0 ? `<span class="badge badge-rose">${item.leaveDaysCount} d</span>` : '-'}
          </td>
          <td class="worker-incidents-col">
            <div class="incidents-container">
              ${incidentsListHtml}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  private static getTypeBadgeClass(type: IncidentType): string {
    switch (type) {
      case IncidentType.OVERTIME: return 'badge-amber';
      case IncidentType.SUBSTITUTION: return 'badge-blue';
      case IncidentType.VACATION: return 'badge-emerald';
      case IncidentType.PERSONAL_MATTERS: return 'badge-purple';
      case IncidentType.LEAVE_OR_DEATH: return 'badge-rose';
      case IncidentType.CONTRACT_END: return 'badge-dark';
      default: return 'badge-subtle';
    }
  }

  private static getWorkerName(workerId: string): string {
    const w = AppState.workers.find(worker => worker.id === workerId);
    return w ? w.name : workerId;
  }

  private static setupListeners(): void {
    const filterCenter = document.getElementById('filter-work-center');
    const filterMonth = document.getElementById('filter-month');
    const filterYear = document.getElementById('filter-year');
    const filterType = document.getElementById('filter-type');
    const searchWorker = document.getElementById('filter-search-worker');
    const btnRefresh = document.getElementById('btn-refresh-report');
    const btnClear = document.getElementById('btn-clear-filters');
    const btnExcel = document.getElementById('btn-export-excel');
    const btnPdf = document.getElementById('btn-export-pdf');

    filterCenter?.addEventListener('change', () => this.loadReport());
    filterMonth?.addEventListener('change', () => this.loadReport());
    filterYear?.addEventListener('change', () => this.loadReport());
    filterType?.addEventListener('change', () => this.loadReport());
    searchWorker?.addEventListener('input', () => this.loadReport());
    btnRefresh?.addEventListener('click', () => this.loadReport());

    btnClear?.addEventListener('click', () => {
      if (filterCenter instanceof HTMLSelectElement) filterCenter.value = '';
      if (filterType instanceof HTMLSelectElement) filterType.value = '';
      if (searchWorker instanceof HTMLInputElement) searchWorker.value = '';
      this.loadReport();
    });

    btnExcel?.addEventListener('click', () => this.downloadExcel());
    btnPdf?.addEventListener('click', () => this.downloadPdf());

    // Delegated incident deletion
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('btn-delete-incident')) {
        const id = target.getAttribute('data-id');
        if (!id) return;
        if (!confirm('¿Eliminar esta incidencia?')) return;

        await withLoader(async () => {
          const res = await fetch(`/api/incidents/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(LanguageManager.t('toastIncidentDeleted'), 'info');
            this.loadReport();
            document.dispatchEvent(new CustomEvent('app:incident-deleted'));
          }
        });
      }
    });
  }

  public static async downloadExcel(): Promise<void> {
    const filterCenter = (document.getElementById('filter-work-center') as HTMLSelectElement)?.value || '';
    const filterMonth = (document.getElementById('filter-month') as HTMLSelectElement)?.value || String(AppState.selectedMonth);
    const filterYear = (document.getElementById('filter-year') as HTMLInputElement)?.value || String(AppState.selectedYear);

    await withLoader(async () => {
      try {
        const query = new URLSearchParams({
          month: filterMonth,
          year: filterYear
        });
        if (filterCenter) query.append('workCenterId', filterCenter);

        const res = await fetch(`/api/reports/export/excel?${query.toString()}`);
        if (!res.ok) throw new Error('Error al generar Excel');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Parte_Incidencias_${filterYear}_${String(filterMonth).padStart(2, '0')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast(LanguageManager.t('toastExportSuccess'), 'success');
      } catch (err: any) {
        showToast(err.message || 'Error al exportar Excel', 'danger');
      }
    }, 'Generando libro Excel...');
  }

  public static async downloadPdf(): Promise<void> {
    const filterCenter = (document.getElementById('filter-work-center') as HTMLSelectElement)?.value || '';
    const filterMonth = (document.getElementById('filter-month') as HTMLSelectElement)?.value || String(AppState.selectedMonth);
    const filterYear = (document.getElementById('filter-year') as HTMLInputElement)?.value || String(AppState.selectedYear);

    await withLoader(async () => {
      try {
        const query = new URLSearchParams({
          month: filterMonth,
          year: filterYear
        });
        if (filterCenter) query.append('workCenterId', filterCenter);

        const res = await fetch(`/api/reports/export/pdf?${query.toString()}`);
        if (!res.ok) throw new Error('Error al generar PDF');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Parte_Incidencias_${filterYear}_${String(filterMonth).padStart(2, '0')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast(LanguageManager.t('toastExportSuccess'), 'success');
      } catch (err: any) {
        showToast(err.message || 'Error al exportar PDF', 'danger');
      }
    }, 'Generando documento PDF...');
  }
}
