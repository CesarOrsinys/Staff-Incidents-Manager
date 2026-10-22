import { AppState } from '../state/AppState.js';
import { IncidentType } from '../../core/domain/enums/IncidentType.js';
import { calculateHours } from '../../core/domain/schemas/IncidentSchema.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';

export class IncidentFormComponent {
  public static init(): void {
    this.populateSelectors();
    this.setupListeners();
    this.setupKeyboardShortcuts();
    this.updateConditionalFields();
  }

  public static populateSelectors(): void {
    // Work Centers
    const selectCenter = document.getElementById('form-work-center') as HTMLSelectElement;
    if (selectCenter) {
      const currentVal = selectCenter.value || AppState.selectedWorkCenterId;
      selectCenter.innerHTML = '<option value="">-- Seleccionar Centro --</option>' +
        AppState.workCenters.map(c => `
          <option value="${c.id}" ${c.id === currentVal ? 'selected' : ''}>${c.name} (${c.code})</option>
        `).join('');
      if (!selectCenter.value && AppState.workCenters.length > 0) {
        selectCenter.value = AppState.workCenters[0].id;
        AppState.selectedWorkCenterId = AppState.workCenters[0].id;
      }
    }

    // Workers datalist for quick autocomplete
    const datalist = document.getElementById('workers-datalist');
    if (datalist) {
      datalist.innerHTML = AppState.workers.filter(w => w.active).map(w => `
        <option value="${w.name}" data-id="${w.id}">
      `).join('');
    }

    // Substituted Worker Selector
    const selectSubstituted = document.getElementById('form-substituted-worker') as HTMLSelectElement;
    if (selectSubstituted) {
      selectSubstituted.innerHTML = '<option value="">-- Seleccionar persona a la que cubre --</option>' +
        AppState.workers.filter(w => w.active).map(w => `
          <option value="${w.id}">${w.name}</option>
        `).join('');
    }

    // Set Default Dates to current month
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startDateInput = document.getElementById('form-start-date') as HTMLInputElement;
    const endDateInput = document.getElementById('form-end-date') as HTMLInputElement;
    if (startDateInput && !startDateInput.value) startDateInput.value = todayStr;
    if (endDateInput && !endDateInput.value) endDateInput.value = todayStr;

    // Period selector
    const monthSelect = document.getElementById('form-period-month') as HTMLSelectElement;
    const yearSelect = document.getElementById('form-period-year') as HTMLInputElement;
    if (monthSelect) monthSelect.value = String(AppState.selectedMonth);
    if (yearSelect) yearSelect.value = String(AppState.selectedYear);
  }

  private static updateConditionalFields(): void {
    const typeSelect = document.getElementById('form-incident-type') as HTMLSelectElement;
    const scheduleRow = document.getElementById('conditional-schedule-row');
    const substitutedRow = document.getElementById('conditional-substituted-row');
    const isRangeCheck = document.getElementById('form-is-range') as HTMLInputElement;
    const endDateWrap = document.getElementById('wrap-end-date');

    const selectedType = typeSelect?.value as IncidentType;

    // Horario (Condicional): Si es Sustitución u Horas Extra
    const requiresSchedule = selectedType === IncidentType.SUBSTITUTION || selectedType === IncidentType.OVERTIME;
    if (scheduleRow) {
      scheduleRow.style.display = requiresSchedule ? 'flex' : 'none';
      if (requiresSchedule) {
        this.updateCalculatedHours();
      }
    }

    // Trabajador Sustituido (Condicional): Si es Sustitución
    const requiresSubstitute = selectedType === IncidentType.SUBSTITUTION;
    if (substitutedRow) {
      substitutedRow.style.display = requiresSubstitute ? 'flex' : 'none';
    }

    // Rango de fechas
    if (endDateWrap && isRangeCheck) {
      endDateWrap.style.display = isRangeCheck.checked ? 'block' : 'none';
      if (!isRangeCheck.checked) {
        const startDateInput = document.getElementById('form-start-date') as HTMLInputElement;
        const endDateInput = document.getElementById('form-end-date') as HTMLInputElement;
        if (startDateInput && endDateInput) {
          endDateInput.value = startDateInput.value;
        }
      }
    }
  }

  private static updateCalculatedHours(): void {
    const startTimeInput = document.getElementById('form-start-time') as HTMLInputElement;
    const endTimeInput = document.getElementById('form-end-time') as HTMLInputElement;
    const hoursDisplay = document.getElementById('form-calculated-hours');

    if (!startTimeInput || !endTimeInput || !hoursDisplay) return;

    const startVal = startTimeInput.value;
    const endVal = endTimeInput.value;

    if (startVal && endVal) {
      try {
        const hours = calculateHours(startVal, endVal);
        hoursDisplay.textContent = `${hours} h`;
        hoursDisplay.className = 'hours-badge hours-badge-active';
      } catch (e) {
        hoursDisplay.textContent = '0 h';
        hoursDisplay.className = 'hours-badge';
      }
    } else {
      hoursDisplay.textContent = '0 h';
      hoursDisplay.className = 'hours-badge';
    }
  }

  private static setupListeners(): void {
    const typeSelect = document.getElementById('form-incident-type');
    typeSelect?.addEventListener('change', () => this.updateConditionalFields());

    const isRangeCheck = document.getElementById('form-is-range');
    isRangeCheck?.addEventListener('change', () => this.updateConditionalFields());

    const startDateInput = document.getElementById('form-start-date') as HTMLInputElement;
    startDateInput?.addEventListener('change', () => {
      const isRange = (document.getElementById('form-is-range') as HTMLInputElement)?.checked;
      if (!isRange) {
        const endDateInput = document.getElementById('form-end-date') as HTMLInputElement;
        if (endDateInput) endDateInput.value = startDateInput.value;
      }
    });

    const startTimeInput = document.getElementById('form-start-time');
    const endTimeInput = document.getElementById('form-end-time');
    startTimeInput?.addEventListener('input', () => this.updateCalculatedHours());
    endTimeInput?.addEventListener('input', () => this.updateCalculatedHours());

    // Submit handler
    const form = document.getElementById('incident-entry-form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveIncident(false);
    });

    const btnSaveAndNext = document.getElementById('btn-save-and-next');
    btnSaveAndNext?.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.saveIncident(true);
    });
  }

  private static setupKeyboardShortcuts(): void {
    const form = document.getElementById('incident-entry-form');
    form?.addEventListener('keydown', async (e: KeyboardEvent) => {
      // Enter without Shift/Ctrl/Alt submits and cycles to next immediately
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        await this.saveIncident(true);
      }
    });
  }

  public static async saveIncident(cycleNext: boolean = true): Promise<void> {
    const centerSelect = document.getElementById('form-work-center') as HTMLSelectElement;
    const workerInput = document.getElementById('form-worker-search') as HTMLInputElement;
    const typeSelect = document.getElementById('form-incident-type') as HTMLSelectElement;
    const startDateInput = document.getElementById('form-start-date') as HTMLInputElement;
    const endDateInput = document.getElementById('form-end-date') as HTMLInputElement;
    const isRangeCheck = document.getElementById('form-is-range') as HTMLInputElement;
    const startTimeInput = document.getElementById('form-start-time') as HTMLInputElement;
    const endTimeInput = document.getElementById('form-end-time') as HTMLInputElement;
    const substitutedSelect = document.getElementById('form-substituted-worker') as HTMLSelectElement;
    const obsInput = document.getElementById('form-observations') as HTMLInputElement;
    const monthSelect = document.getElementById('form-period-month') as HTMLSelectElement;
    const yearSelect = document.getElementById('form-period-year') as HTMLInputElement;

    const workCenterId = centerSelect?.value;
    const workerName = workerInput?.value.trim();
    const type = typeSelect?.value as IncidentType;
    const startDate = startDateInput?.value;
    const isRange = isRangeCheck?.checked || false;
    const endDate = isRange ? endDateInput?.value : startDate;
    const startTime = startTimeInput?.value || null;
    const endTime = endTimeInput?.value || null;
    const substitutedWorkerId = substitutedSelect?.value || null;
    const observations = obsInput?.value.trim() || null;
    const periodMonth = Number(monthSelect?.value) || (new Date().getMonth() + 1);
    const periodYear = Number(yearSelect?.value) || new Date().getFullYear();

    // Find worker by exact name or ID
    const worker = AppState.workers.find(w => 
      w.name.toLowerCase() === workerName.toLowerCase() || w.id === workerName
    );

    if (!workCenterId) {
      showToast(LanguageManager.t('errWorkCenterRequired'), 'danger');
      centerSelect?.focus();
      return;
    }

    if (!worker) {
      showToast(LanguageManager.t('errWorkerNotFound'), 'danger');
      workerInput?.focus();
      return;
    }

    const payload: any = {
      workCenterId,
      workerId: worker.id,
      type,
      startDate,
      endDate,
      isRange,
      periodMonth,
      periodYear,
      startTime: (type === IncidentType.SUBSTITUTION || type === IncidentType.OVERTIME) ? startTime : null,
      endTime: (type === IncidentType.SUBSTITUTION || type === IncidentType.OVERTIME) ? endTime : null,
      substitutedWorkerId: type === IncidentType.SUBSTITUTION ? substitutedWorkerId : null,
      observations,
      createdBy: AppState.currentUser?.name || 'Gerente'
    };

    await withLoader(async () => {
      try {
        const res = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al registrar incidencia');
        }

        AppState.incidents.unshift(data);
        showToast(LanguageManager.t('toastIncidentCreated'), 'success');

        // Play subtle soft click audio confirmation
        this.playSuccessBeep();

        // Increment live counter
        this.incrementSessionCounter();

        // Update other views in background
        document.dispatchEvent(new CustomEvent('app:incident-added'));

        if (cycleNext) {
          // Rapid Bulk Entry Cycling:
          // Keep Work Center & Period & Type (or reset type)
          // Clear Worker, Times, Substituted worker and Observations
          if (workerInput) {
            workerInput.value = '';
            workerInput.focus();
          }
          if (obsInput) obsInput.value = '';
          if (substitutedSelect) substitutedSelect.value = '';
          if (startTimeInput) startTimeInput.value = '';
          if (endTimeInput) endTimeInput.value = '';
          this.updateCalculatedHours();
        }
      } catch (err: any) {
        showToast(LanguageManager.t(err.message || 'Error al guardar incidencia'), 'danger');
      }
    }, 'Guardando registro...');
  }

  private static incrementSessionCounter(): void {
    const counterEl = document.getElementById('session-entries-count');
    if (counterEl) {
      const current = parseInt(counterEl.textContent || '0', 10);
      counterEl.textContent = String(current + 1);
    }
  }

  private static playSuccessBeep(): void {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {
      // Audio not supported, ignore safely
    }
  }
}
