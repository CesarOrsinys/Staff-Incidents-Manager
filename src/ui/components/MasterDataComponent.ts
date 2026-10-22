import { AppState } from '../state/AppState.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';
import { WorkCenter } from '../../core/domain/entities/WorkCenter.js';
import { Worker } from '../../core/domain/entities/Worker.js';

export class MasterDataComponent {
  public static init(): void {
    this.renderWorkCenters();
    this.renderWorkers();
    this.setupListeners();
  }

  public static async loadData(): Promise<void> {
    try {
      const [resCenters, resWorkers] = await Promise.all([
        fetch('/api/work-centers'),
        fetch('/api/workers')
      ]);

      if (resCenters.ok) AppState.workCenters = await resCenters.json();
      if (resWorkers.ok) AppState.workers = await resWorkers.json();

      this.renderWorkCenters();
      this.renderWorkers();
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  }

  public static renderWorkCenters(): void {
    const tbody = document.getElementById('work-centers-tbody');
    if (!tbody) return;

    if (AppState.workCenters.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No hay centros de trabajo registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = AppState.workCenters.map(wc => `
      <tr>
        <td><strong>${wc.code}</strong></td>
        <td>${wc.name}</td>
        <td>${wc.city || '-'}</td>
        <td>${wc.address || '-'}</td>
        <td class="text-right">
          <button class="btn-sm btn-outline-danger btn-delete-center" data-id="${wc.id}" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  public static renderWorkers(): void {
    const tbody = document.getElementById('workers-tbody');
    if (!tbody) return;

    if (AppState.workers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay trabajadores registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = AppState.workers.map(w => {
      const center = AppState.workCenters.find(c => c.id === w.assignedWorkCenterId);
      const contractLabel = LanguageManager.t(`contract_${w.contractStatus}`) || w.contractStatus;
      return `
        <tr>
          <td><strong>${w.name}</strong></td>
          <td>${w.documentId || '-'}</td>
          <td><span class="badge badge-subtle">${contractLabel}</span></td>
          <td>${center ? center.name : '-'}</td>
          <td><span class="badge ${w.active ? 'badge-success' : 'badge-danger'}">${w.active ? 'Activo' : 'Inactivo'}</span></td>
          <td class="text-right">
            <button class="btn-sm btn-outline-danger btn-delete-worker" data-id="${w.id}" title="Eliminar">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  private static setupListeners(): void {
    // Add Center Modal
    const btnAddCenter = document.getElementById('btn-add-center');
    const modalCenter = document.getElementById('modal-add-center');
    const btnCloseCenter = document.getElementById('btn-close-center-modal');
    const formCenter = document.getElementById('form-add-center') as HTMLFormElement;

    btnAddCenter?.addEventListener('click', () => {
      if (modalCenter) modalCenter.style.display = 'flex';
      formCenter?.reset();
    });

    btnCloseCenter?.addEventListener('click', () => {
      if (modalCenter) modalCenter.style.display = 'none';
    });

    formCenter?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('input-center-name') as HTMLInputElement)?.value.trim();
      const code = (document.getElementById('input-center-code') as HTMLInputElement)?.value.trim();
      const address = (document.getElementById('input-center-address') as HTMLInputElement)?.value.trim();
      const city = (document.getElementById('input-center-city') as HTMLInputElement)?.value.trim();

      await withLoader(async () => {
        try {
          const res = await fetch('/api/work-centers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, code, address, city })
          });
          if (!res.ok) throw new Error('Error al crear el centro');
          const created = await res.json();
          AppState.workCenters.push(created);
          this.renderWorkCenters();
          if (modalCenter) modalCenter.style.display = 'none';
          showToast('Centro de trabajo creado con éxito', 'success');
          document.dispatchEvent(new CustomEvent('app:master-data-changed'));
        } catch (err: any) {
          showToast(err.message, 'danger');
        }
      });
    });

    // Add Worker Modal
    const btnAddWorker = document.getElementById('btn-add-worker');
    const modalWorker = document.getElementById('modal-add-worker');
    const btnCloseWorker = document.getElementById('btn-close-worker-modal');
    const formWorker = document.getElementById('form-add-worker') as HTMLFormElement;

    btnAddWorker?.addEventListener('click', () => {
      if (modalWorker) {
        // Populate center options
        const selectCenter = document.getElementById('select-worker-center') as HTMLSelectElement;
        if (selectCenter) {
          selectCenter.innerHTML = '<option value="">-- Sin asignar --</option>' +
            AppState.workCenters.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('');
        }
        modalWorker.style.display = 'flex';
        formWorker?.reset();
      }
    });

    btnCloseWorker?.addEventListener('click', () => {
      if (modalWorker) modalWorker.style.display = 'none';
    });

    formWorker?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('input-worker-name') as HTMLInputElement)?.value.trim();
      const documentId = (document.getElementById('input-worker-dni') as HTMLInputElement)?.value.trim();
      const contractStatus = (document.getElementById('select-worker-contract') as HTMLSelectElement)?.value;
      const assignedWorkCenterId = (document.getElementById('select-worker-center') as HTMLSelectElement)?.value || undefined;

      await withLoader(async () => {
        try {
          const res = await fetch('/api/workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, documentId, contractStatus, assignedWorkCenterId })
          });
          if (!res.ok) throw new Error('Error al registrar trabajador');
          const created = await res.json();
          AppState.workers.push(created);
          this.renderWorkers();
          if (modalWorker) modalWorker.style.display = 'none';
          showToast('Trabajador añadido con éxito', 'success');
          document.dispatchEvent(new CustomEvent('app:master-data-changed'));
        } catch (err: any) {
          showToast(err.message, 'danger');
        }
      });
    });

    // Delegated delete buttons
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('btn-delete-center') || target.closest('.btn-delete-center')) {
        const btn = target.classList.contains('btn-delete-center') ? target : target.closest('.btn-delete-center') as HTMLElement;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('¿Seguro que deseas eliminar este centro de trabajo?')) return;

        await withLoader(async () => {
          const res = await fetch(`/api/work-centers/${id}`, { method: 'DELETE' });
          if (res.ok) {
            AppState.workCenters = AppState.workCenters.filter(c => c.id !== id);
            this.renderWorkCenters();
            showToast('Centro de trabajo eliminado', 'info');
            document.dispatchEvent(new CustomEvent('app:master-data-changed'));
          }
        });
      }

      if (target.classList.contains('btn-delete-worker') || target.closest('.btn-delete-worker')) {
        const btn = target.classList.contains('btn-delete-worker') ? target : target.closest('.btn-delete-worker') as HTMLElement;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('¿Seguro que deseas eliminar este trabajador y sus registros asociados?')) return;

        await withLoader(async () => {
          const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' });
          if (res.ok) {
            AppState.workers = AppState.workers.filter(w => w.id !== id);
            this.renderWorkers();
            showToast('Trabajador eliminado', 'info');
            document.dispatchEvent(new CustomEvent('app:master-data-changed'));
          }
        });
      }
    });
  }
}
