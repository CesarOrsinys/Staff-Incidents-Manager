import { AppState } from '../state/AppState.js';
import { MonthlyWorkerReportItem } from '../../core/ports/IExportService.js';
import { IncidentType } from '../../core/domain/enums/IncidentType.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';

import { MasterDataComponent } from './MasterDataComponent.js';

export class MonthlyReportComponent {
  private static currentFilter: 'all' | 'owed' | 'overtime' = 'all';
  private static onlyWithIncidents: boolean = true;
  private static activeViewMode: 'cards' | 'table' = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 'cards' : 'table';

  public static init(): void {
    this.setupListeners();
  }

  private static formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.includes(' al ')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
    }
    return dateStr;
  }

  public static setViewMode(mode: 'cards' | 'table'): void {
    this.activeViewMode = mode;
    const btnCards = document.getElementById('btn-view-cards');
    const btnTable = document.getElementById('btn-view-table');
    const cardsContainer = document.getElementById('report-cards-container');
    const tableContainer = document.getElementById('report-table-container');

    btnCards?.classList.toggle('active', mode === 'cards');
    btnTable?.classList.toggle('active', mode === 'table');

    if (cardsContainer) cardsContainer.style.display = (mode === 'cards') ? 'flex' : 'none';
    if (tableContainer) tableContainer.style.display = (mode === 'table') ? 'block' : 'none';
  }

  public static toggleOnlyWithIncidents(): void {
    this.onlyWithIncidents = !this.onlyWithIncidents;
    const btnNonEmpty = document.getElementById('filter-btn-non-empty');
    btnNonEmpty?.classList.toggle('active', this.onlyWithIncidents);
    this.renderOfficialTable(AppState.monthlyReport);
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

    // Filter out workers without incidents if onlyWithIncidents is true (avoids blank rows on screen)
    if (this.onlyWithIncidents) {
      filteredData = filteredData.filter(item => 
        (item.incidents && item.incidents.length > 0) ||
        (item.absentDates && item.absentDates.length > 0)
      );
    }

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
        // If worker has absences due to substitution or leave
        if (item.absentDates && item.absentDates.length > 0) {
          for (const abs of item.absentDates) {
            const formattedDate = this.formatDisplayDate(abs.date);
            const desc = abs.substitutedBy ? `Suplido/a por ${abs.substitutedBy}` : abs.reason;
            rowsHtml += `
              <tr class="sheet-data-row">
                <td class="col-worker font-bold">${workerName}</td>
                <td class="col-date">${formattedDate}</td>
                <td class="col-incident text-rose">${desc}</td>
              </tr>
            `;
          }
        } else if (!this.onlyWithIncidents) {
          // Empty line with worker name (only if user explicitly chose to see all workers)
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
              const subName = subbed ? subbed.name : 'compañero/a';
              incDesc = `${inc.startTime || ''} a ${inc.endTime || ''} por ${subName}`;
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

    if (!rowsHtml) {
      rowsHtml = `
        <tr class="sheet-data-row">
          <td colspan="3" style="text-align: center; padding: 1.5rem; color: var(--text-secondary); font-style: italic;">
            No hay registros con los filtros seleccionados
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = rowsHtml;

    // Render mobile cards feed
    this.renderMobileCards(filteredData);

    // Apply active view mode (cards on mobile, table on desktop)
    this.setViewMode(this.activeViewMode);
  }

  private static renderMobileCards(filteredData: MonthlyWorkerReportItem[]): void {
    const cardsContainer = document.getElementById('report-cards-container');
    if (!cardsContainer) return;

    let cardsHtml = '';
    let totalItems = 0;

    for (const item of filteredData) {
      const workerName = item.worker.name.toUpperCase();
      const incidents = item.incidents || [];
      const absentDates = item.absentDates || [];

      for (const inc of incidents) {
        totalItems++;
        let dateStr = inc.startDate;
        if (inc.isRange && inc.endDate && inc.endDate !== inc.startDate) {
          dateStr = `${inc.startDate.slice(8)} al ${inc.endDate.slice(8)}/${inc.startDate.slice(5, 7)}/${inc.startDate.slice(2, 4)}`;
        } else if (inc.startDate) {
          const parts = inc.startDate.split('-');
          dateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : inc.startDate;
        }

        let incDesc = inc.observations || '';
        let badgeClass = 'border-emerald';
        let typeIcon = '⏱️';

        if (inc.type === IncidentType.SUBSTITUTION) {
          const subbed = AppState.workers.find(w => w.id === inc.substitutedWorkerId);
          const subName = subbed ? subbed.name : 'compañero/a';
          if (!incDesc) incDesc = `${inc.startTime || ''} a ${inc.endTime || ''} por ${subName}`;
          badgeClass = 'border-emerald';
          typeIcon = '🔄';
        } else if (inc.type === IncidentType.VACATION) {
          if (!incDesc) incDesc = 'Días de vacaciones pendientes';
          badgeClass = 'border-amber';
          typeIcon = '🏖️';
        } else if (inc.type === IncidentType.PERSONAL_MATTERS) {
          if (!incDesc) incDesc = 'Día de asuntos propios reglamentario';
          badgeClass = 'border-blue';
          typeIcon = '📝';
        } else if (inc.type === IncidentType.LEAVE_OR_DEATH) {
          if (!incDesc) incDesc = 'Baja médica por IT con justificante';
          badgeClass = 'border-rose';
          typeIcon = '🏥';
        } else if (inc.type === IncidentType.CONTRACT_END) {
          if (!incDesc) incDesc = 'Fin de contrato de interinidad';
          badgeClass = 'border-rose';
          typeIcon = '📋';
        }

        cardsHtml += `
          <div class="incident-mobile-card">
            <div class="card-top-row">
              <div class="card-worker-title">
                <span>👤</span>
                <span>${workerName}</span>
              </div>
              <div class="card-date-badge">
                <span>📅</span> ${dateStr}
              </div>
            </div>
            <div class="card-incident-body ${badgeClass}">
              <span>${typeIcon}</span>
              <span>${incDesc}</span>
            </div>
            <div class="card-bottom-actions">
              <button class="btn-delete-card btn-delete-row" data-id="${inc.id}" title="Eliminar este registro">
                <span>🗑️</span> <span>Eliminar</span>
              </button>
            </div>
          </div>
        `;
      }

      for (const abs of absentDates) {
        totalItems++;
        const formattedDate = this.formatDisplayDate(abs.date);
        const desc = abs.substitutedBy ? `Suplido/a por ${abs.substitutedBy} (horas a deber)` : abs.reason;
        cardsHtml += `
          <div class="incident-mobile-card">
            <div class="card-top-row">
              <div class="card-worker-title">
                <span>👤</span>
                <span>${workerName}</span>
              </div>
              <div class="card-date-badge" style="background:rgba(244,63,94,0.12); color:var(--accent-rose); border-color:rgba(244,63,94,0.25);">
                <span>📅</span> ${formattedDate}
              </div>
            </div>
            <div class="card-incident-body border-rose">
              <span>⚠️</span>
              <span>${desc}</span>
            </div>
          </div>
        `;
      }
    }

    if (totalItems === 0) {
      cardsHtml = `
        <div class="incident-mobile-card text-center text-muted" style="padding:32px 16px; text-align:center;">
          <p style="font-size:1.1rem; margin-bottom:6px;">📭 Sin incidencias registradas</p>
          <p style="font-size:0.84rem;">No se encontraron registros activos para los filtros seleccionados.</p>
        </div>
      `;
    }

    cardsContainer.innerHTML = cardsHtml;
  }

  private static setupListeners(): void {
    const filterCenter = document.getElementById('report-work-center');
    const filterMonth = document.getElementById('report-month');
    const filterYear = document.getElementById('report-year');
    const btnNonEmpty = document.getElementById('filter-btn-non-empty');
    const btnAll = document.getElementById('filter-btn-all');
    const btnOwed = document.getElementById('filter-btn-owed');
    const btnOvertime = document.getElementById('filter-btn-overtime');
    const btnViewCards = document.getElementById('btn-view-cards');
    const btnViewTable = document.getElementById('btn-view-table');
    const btnPrint = document.getElementById('btn-print-sheet');
    const btnExcel = document.getElementById('btn-download-excel');
    const btnPdf = document.getElementById('btn-download-pdf');

    filterCenter?.addEventListener('change', () => this.loadReport());
    filterMonth?.addEventListener('change', () => this.loadReport());
    filterYear?.addEventListener('change', () => this.loadReport());

    btnNonEmpty?.addEventListener('click', () => this.toggleOnlyWithIncidents());
    btnAll?.addEventListener('click', () => this.setFilter('all'));
    btnOwed?.addEventListener('click', () => this.setFilter('owed'));
    btnOvertime?.addEventListener('click', () => this.setFilter('overtime'));

    btnViewCards?.addEventListener('click', () => this.setViewMode('cards'));
    btnViewTable?.addEventListener('click', () => this.setViewMode('table'));

    btnPrint?.addEventListener('click', () => window.print());
    btnExcel?.addEventListener('click', () => this.exportExcel());
    btnPdf?.addEventListener('click', () => this.exportPdf());

    // Delegated incident deletion
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('btn-delete-row') || target.closest('.btn-delete-row')) {
        const btn = target.classList.contains('btn-delete-row') ? target : target.closest('.btn-delete-row') as HTMLElement;
        const id = btn.getAttribute('data-id');
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
          workCenterId: filterCenter,
          filterType: this.currentFilter,
          onlyWithIncidents: String(this.onlyWithIncidents)
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
          workCenterId: filterCenter,
          filterType: this.currentFilter,
          onlyWithIncidents: String(this.onlyWithIncidents)
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
