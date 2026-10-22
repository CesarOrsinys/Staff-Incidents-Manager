import { AppState } from '../state/AppState.js';
import { IncidentType } from '../../core/domain/enums/IncidentType.js';
import { calculateHours } from '../../core/domain/schemas/IncidentSchema.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';

import { MasterDataComponent } from './MasterDataComponent.js';

export class IncidentFormComponent {
  public static init(): void {
    this.setupListeners();
    this.setupDateModeSwitching();
  }

  public static async populateCenters(): Promise<void> {
    await MasterDataComponent.ensureCentersLoaded();
    const selectCenter = document.getElementById('form-work-center') as HTMLSelectElement;
    if (!selectCenter) return;

    selectCenter.innerHTML = AppState.workCenters.map(c => `
      <option value="${c.id}" ${c.id === 'wc_borrull' || c.code === 'BOR-001' ? 'selected' : ''}>
        ${c.name} (${c.code})
      </option>
    `).join('');

    if (!selectCenter.value && AppState.workCenters.length > 0) {
      selectCenter.value = AppState.workCenters[0].id;
    }

    AppState.selectedWorkCenterId = selectCenter.value;
    if (selectCenter.value) {
      await this.loadWorkersForCenter(selectCenter.value);
    }
  }

  public static async loadWorkersForCenter(centerId: string): Promise<void> {
    if (!centerId) return;
    await withLoader(async () => {
      try {
        const headers: Record<string, string> = {};
        if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
        const res = await fetch(`/api/workers?workCenterId=${centerId}`, { headers });
        if (res.ok) {
          const workers = await res.json();
          AppState.workers = workers;
        }
      } catch (err) {
        console.warn('Fallback to local workers cache:', err);
      }

      const activeWorkers = AppState.workers.filter(w => !centerId || w.assignedWorkCenterId === centerId || w.active);
      const workerSelect = document.getElementById('form-worker-select') as HTMLSelectElement;
      if (workerSelect) {
        workerSelect.innerHTML = '<option value="">-- Seleccionar Trabajador/a --</option>' +
          activeWorkers.map(w => `<option value="${w.id}">${w.name} (${w.documentId || 'Sin DNI'})</option>`).join('');
      }

      this.updateSubstituteOptions();
    }, 'Cargando trabajadores del centro...');
  }

  public static updateSubstituteOptions(): void {
    const workerSelect = document.getElementById('form-worker-select') as HTMLSelectElement;
    const substituteSelect = document.getElementById('form-substituted-worker') as HTMLSelectElement;
    if (!substituteSelect) return;

    const currentWorkerId = workerSelect?.value;
    const availableForSub = AppState.workers.filter(w => w.id !== currentWorkerId && w.active);

    substituteSelect.innerHTML = '<option value="">-- Seleccionar persona a la que se le hizo suplencia --</option>' +
      availableForSub.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  }

  private static setupDateModeSwitching(): void {
    const btnModeRange = document.getElementById('btn-mode-range');
    const btnModeSingle = document.getElementById('btn-mode-single');
    const panelRange = document.getElementById('panel-mode-range');
    const panelSingle = document.getElementById('panel-mode-single');
    const reasonSelect = document.getElementById('form-reason-select') as HTMLSelectElement;
    const wrapReasonCustom = document.getElementById('wrap-reason-custom');
    const contractEndCheck = document.getElementById('form-contract-end-check') as HTMLInputElement;
    const panelSingleSchedule = document.getElementById('panel-single-schedule');

    btnModeRange?.addEventListener('click', () => {
      btnModeRange.classList.add('active');
      btnModeSingle?.classList.remove('active');
      if (panelRange) panelRange.style.display = 'block';
      if (panelSingle) panelSingle.style.display = 'none';
    });

    btnModeSingle?.addEventListener('click', () => {
      btnModeSingle.classList.add('active');
      btnModeRange?.classList.remove('active');
      if (panelSingle) panelSingle.style.display = 'block';
      if (panelRange) panelRange.style.display = 'none';
    });

    reasonSelect?.addEventListener('change', () => {
      if (wrapReasonCustom) {
        wrapReasonCustom.style.display = reasonSelect.value === 'OTRO' ? 'block' : 'none';
      }
    });

    contractEndCheck?.addEventListener('change', () => {
      if (panelSingleSchedule) {
        panelSingleSchedule.style.display = contractEndCheck.checked ? 'none' : 'block';
      }
    });

    // Time inputs calculation
    const startTimeInput = document.getElementById('form-start-time') as HTMLInputElement;
    const endTimeInput = document.getElementById('form-end-time') as HTMLInputElement;
    const hoursBadge = document.getElementById('form-calculated-hours');

    const updateHours = () => {
      const s = startTimeInput?.value;
      const e = endTimeInput?.value;
      if (s && e) {
        const h = calculateHours(s, e);
        if (hoursBadge) hoursBadge.textContent = `${h.toFixed(1)} horas extras`;
      } else if (hoursBadge) {
        hoursBadge.textContent = '0 horas';
      }
    };

    startTimeInput?.addEventListener('input', updateHours);
    endTimeInput?.addEventListener('input', updateHours);
  }

  private static setupListeners(): void {
    const selectCenter = document.getElementById('form-work-center') as HTMLSelectElement;
    const workerSelect = document.getElementById('form-worker-select') as HTMLSelectElement;
    const form = document.getElementById('incident-entry-form') as HTMLFormElement;

    selectCenter?.addEventListener('change', () => {
      AppState.selectedWorkCenterId = selectCenter.value;
      this.loadWorkersForCenter(selectCenter.value);
    });

    workerSelect?.addEventListener('change', () => {
      this.updateSubstituteOptions();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveIncident();
    });
  }

  private static async saveIncident(): Promise<void> {
    const workCenterId = (document.getElementById('form-work-center') as HTMLSelectElement)?.value;
    const workerId = (document.getElementById('form-worker-select') as HTMLSelectElement)?.value;
    const isRange = document.getElementById('btn-mode-range')?.classList.contains('active');

    if (!workCenterId) {
      showToast('Por favor, selecciona un centro de trabajo.', 'warning');
      return;
    }
    if (!workerId) {
      showToast('Por favor, selecciona el trabajador.', 'warning');
      return;
    }

    let payload: any = {
      workCenterId,
      workerId,
      periodMonth: AppState.selectedMonth,
      periodYear: AppState.selectedYear,
      isRange
    };

    if (isRange) {
      const startDate = (document.getElementById('form-range-start-date') as HTMLInputElement)?.value;
      const endDate = (document.getElementById('form-range-end-date') as HTMLInputElement)?.value;
      const reasonSelect = (document.getElementById('form-reason-select') as HTMLSelectElement)?.value;
      const reasonCustom = (document.getElementById('form-reason-custom') as HTMLInputElement)?.value.trim();

      if (!startDate || !endDate) {
        showToast('Debes indicar fecha de inicio y fecha de fin.', 'warning');
        return;
      }
      if (endDate < startDate) {
        showToast('La fecha fin no puede ser anterior a la de inicio.', 'danger');
        return;
      }

      let type = IncidentType.PERSONAL_MATTERS;
      let observations = reasonSelect;

      if (reasonSelect === 'VACACIONES') {
        type = IncidentType.VACATION;
        observations = 'Vacaciones';
      } else if (reasonSelect === 'ASUNTOS_PROPIOS') {
        type = IncidentType.PERSONAL_MATTERS;
        observations = 'Asuntos propios';
      } else if (reasonSelect === 'FALLECIMIENTO') {
        type = IncidentType.LEAVE_OR_DEATH;
        observations = 'Fallecimiento familiar';
      } else if (reasonSelect === 'MEDICO' || reasonSelect === 'BAJA') {
        type = IncidentType.LEAVE_OR_DEATH;
        observations = reasonSelect === 'BAJA' ? 'Baja médica / IT' : 'Asunto médico';
      } else if (reasonSelect === 'PATERNIDAD') {
        type = IncidentType.LEAVE_OR_DEATH;
        observations = 'Permiso paternidad / maternidad';
      } else if (reasonSelect === 'OTRO') {
        type = IncidentType.PERSONAL_MATTERS;
        observations = reasonCustom || 'Otro motivo';
      }

      payload = {
        ...payload,
        type,
        startDate,
        endDate,
        totalHours: 0,
        observations
      };
    } else {
      // Fecha puntual
      const singleDate = (document.getElementById('form-single-date') as HTMLInputElement)?.value;
      const isContractEnd = (document.getElementById('form-contract-end-check') as HTMLInputElement)?.checked;

      if (!singleDate) {
        showToast('Debes indicar la fecha.', 'warning');
        return;
      }

      if (isContractEnd) {
        payload = {
          ...payload,
          type: IncidentType.CONTRACT_END,
          startDate: singleDate,
          endDate: singleDate,
          totalHours: 0,
          observations: `Término de contrato ${singleDate}`
        };
      } else {
        // Suplencia / Horas extras
        const startTime = (document.getElementById('form-start-time') as HTMLInputElement)?.value;
        const endTime = (document.getElementById('form-end-time') as HTMLInputElement)?.value;
        const substitutedWorkerId = (document.getElementById('form-substituted-worker') as HTMLSelectElement)?.value;
        const generalObs = (document.getElementById('form-single-observations') as HTMLInputElement)?.value.trim();

        if (!startTime || !endTime) {
          showToast('Indica la hora de inicio y fin de la suplencia.', 'warning');
          return;
        }
        if (!substitutedWorkerId) {
          showToast('Selecciona a la persona a la que se le hizo suplencia.', 'warning');
          return;
        }
        if (substitutedWorkerId === workerId) {
          showToast('Un trabajador no puede sustituirse a sí mismo.', 'danger');
          return;
        }

        const subWorkerObj = AppState.workers.find(w => w.id === substitutedWorkerId);
        const subName = subWorkerObj ? subWorkerObj.name.split(' ')[0] : 'compañero';
        const hours = calculateHours(startTime, endTime);

        payload = {
          ...payload,
          type: IncidentType.SUBSTITUTION,
          startDate: singleDate,
          endDate: singleDate,
          startTime,
          endTime,
          totalHours: hours,
          substitutedWorkerId,
          observations: generalObs || `${startTime}-${endTime} Por ${subName}.`
        };
      }
    }

    await withLoader(async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
        const res = await fetch('/api/incidents', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al guardar incidencia');
        }

        showToast('Incidencia guardada con éxito', 'success');

        // Reset fields but keep work center selected
        const workerSelect = document.getElementById('form-worker-select') as HTMLSelectElement;
        if (workerSelect) workerSelect.value = '';
        const startTimeInput = document.getElementById('form-start-time') as HTMLInputElement;
        const endTimeInput = document.getElementById('form-end-time') as HTMLInputElement;
        if (startTimeInput) startTimeInput.value = '';
        if (endTimeInput) endTimeInput.value = '';
        const subSelect = document.getElementById('form-substituted-worker') as HTMLSelectElement;
        if (subSelect) subSelect.value = '';
        const contractEndCheck = document.getElementById('form-contract-end-check') as HTMLInputElement;
        if (contractEndCheck) {
          contractEndCheck.checked = false;
          const panelSingleSchedule = document.getElementById('panel-single-schedule');
          if (panelSingleSchedule) panelSingleSchedule.style.display = 'block';
        }

        document.dispatchEvent(new CustomEvent('app:incident-added'));
      } catch (err: any) {
        showToast(err.message || 'Error al registrar incidencia', 'danger');
      }
    }, 'Guardando incidencia...');
  }
}
