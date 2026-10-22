import { AppState } from '../state/AppState.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';
import { WorkCenter } from '../../core/domain/entities/WorkCenter.js';
import { Worker } from '../../core/domain/entities/Worker.js';

export class MasterDataComponent {
  private static editingCenterId: string | null = null;
  private static editingWorkerId: string | null = null;

  public static init(): void {
    this.setupListeners();
  }

  public static async ensureCentersLoaded(): Promise<void> {
    if (AppState.workCenters && AppState.workCenters.length > 0) return;
    try {
      const headers: Record<string, string> = {};
      if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
      const res = await fetch('/api/work-centers', { headers });
      if (res.ok) {
        AppState.workCenters = await res.json();
      }
    } catch (err) {
      console.error('Error loading work centers:', err);
    }
  }

  public static async loadData(): Promise<void> {
    if (!AppState.currentUser) return;
    await withLoader(async () => {
      try {
        const headers: Record<string, string> = {};
        if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
        const [resCenters, resWorkers] = await Promise.all([
          fetch('/api/work-centers', { headers }),
          fetch('/api/workers', { headers })
        ]);

        if (resCenters.ok) AppState.workCenters = await resCenters.json();
        if (resWorkers.ok) AppState.workers = await resWorkers.json();

        this.renderWorkCenters();
        this.renderWorkers();
      } catch (err) {
        console.error('Error loading master data:', err);
      }
    }, 'Cargando centros y trabajadores...');
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
        <td class="text-right" style="white-space:nowrap;">
          <button class="btn-sm btn-outline-primary btn-edit-center" data-id="${wc.id}" title="Editar Centro" style="margin-right:6px; cursor:pointer; padding:4px 8px; border-radius:6px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:var(--accent-blue);">✏️ Editar</button>
          <button class="btn-sm btn-outline-danger btn-delete-center" data-id="${wc.id}" title="Eliminar" style="cursor:pointer; padding:4px 8px; border-radius:6px; background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.3); color:var(--accent-rose);">🗑️</button>
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
          <td class="text-right" style="white-space:nowrap;">
            <button class="btn-sm btn-outline-primary btn-edit-worker" data-id="${w.id}" title="Editar Trabajador" style="margin-right:6px; cursor:pointer; padding:4px 8px; border-radius:6px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:var(--accent-blue);">✏️ Editar</button>
            <button class="btn-sm btn-outline-danger btn-delete-worker" data-id="${w.id}" title="Eliminar" style="cursor:pointer; padding:4px 8px; border-radius:6px; background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.3); color:var(--accent-rose);">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  private static setupListeners(): void {
    // Add Center Modal
    const btnAddCenter = document.getElementById('btn-add-center');
    const modalAddCenter = document.getElementById('modal-add-center');
    const btnCloseAddCenter = document.getElementById('btn-close-center-modal');
    const formAddCenter = document.getElementById('form-add-center') as HTMLFormElement;

    // Edit Center Modal
    const modalEditCenter = document.getElementById('modal-edit-center');
    const btnCloseEditCenter = document.getElementById('btn-close-edit-center-modal');
    const formEditCenter = document.getElementById('form-edit-center') as HTMLFormElement;

    btnAddCenter?.addEventListener('click', () => {
      if (modalAddCenter) modalAddCenter.style.display = 'flex';
      formAddCenter?.reset();
    });

    btnCloseAddCenter?.addEventListener('click', () => {
      if (modalAddCenter) modalAddCenter.style.display = 'none';
    });

    btnCloseEditCenter?.addEventListener('click', () => {
      if (modalEditCenter) modalEditCenter.style.display = 'none';
      this.editingCenterId = null;
    });

    formAddCenter?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('input-center-name') as HTMLInputElement)?.value.trim();
      const code = (document.getElementById('input-center-code') as HTMLInputElement)?.value.trim();
      const address = (document.getElementById('input-center-address') as HTMLInputElement)?.value.trim();
      const city = (document.getElementById('input-center-city') as HTMLInputElement)?.value.trim();

      await withLoader(async () => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
          const res = await fetch('/api/work-centers', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name, code, address, city })
          });
          if (!res.ok) throw new Error('Error al crear el centro');
          const created = await res.json();
          AppState.workCenters.push(created);
          this.renderWorkCenters();
          if (modalAddCenter) modalAddCenter.style.display = 'none';
          showToast('Centro de trabajo creado con éxito', 'success');
          document.dispatchEvent(new CustomEvent('app:master-data-changed'));
        } catch (err: any) {
          showToast(err.message, 'danger');
        }
      }, 'Creando centro de trabajo...');
    });

    formEditCenter?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.editingCenterId) return;

      const name = (document.getElementById('input-edit-center-name') as HTMLInputElement)?.value.trim();
      const code = (document.getElementById('input-edit-center-code') as HTMLInputElement)?.value.trim();
      const address = (document.getElementById('input-edit-center-address') as HTMLInputElement)?.value.trim();
      const city = (document.getElementById('input-edit-center-city') as HTMLInputElement)?.value.trim();

      await withLoader(async () => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
          const res = await fetch(`/api/work-centers/${this.editingCenterId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name, code, address, city })
          });
          if (!res.ok) throw new Error('Error al actualizar el centro');
          const updated = await res.json();
          const idx = AppState.workCenters.findIndex(c => c.id === this.editingCenterId);
          if (idx !== -1) AppState.workCenters[idx] = updated;

          this.renderWorkCenters();
          if (modalEditCenter) modalEditCenter.style.display = 'none';
          this.editingCenterId = null;
          showToast('Centro de trabajo actualizado con éxito', 'success');
          document.dispatchEvent(new CustomEvent('app:master-data-changed'));
        } catch (err: any) {
          showToast(err.message, 'danger');
        }
      }, 'Actualizando centro de trabajo...');
    });

    // Add Worker Modal
    const btnAddWorker = document.getElementById('btn-add-worker');
    const modalAddWorker = document.getElementById('modal-add-worker');
    const btnCloseAddWorker = document.getElementById('btn-close-worker-modal');
    const formAddWorker = document.getElementById('form-add-worker') as HTMLFormElement;

    // Edit Worker Modal
    const modalEditWorker = document.getElementById('modal-edit-worker');
    const btnCloseEditWorker = document.getElementById('btn-close-edit-worker-modal');
    const formEditWorker = document.getElementById('form-edit-worker') as HTMLFormElement;

    btnAddWorker?.addEventListener('click', () => {
      if (modalAddWorker) {
        const selectCenter = document.getElementById('select-worker-center') as HTMLSelectElement;
        if (selectCenter) {
          selectCenter.innerHTML = '<option value="">-- Sin asignar --</option>' +
            AppState.workCenters.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('');
        }
        modalAddWorker.style.display = 'flex';
        formAddWorker?.reset();
      }
    });

    btnCloseAddWorker?.addEventListener('click', () => {
      if (modalAddWorker) modalAddWorker.style.display = 'none';
    });

    btnCloseEditWorker?.addEventListener('click', () => {
      if (modalEditWorker) modalEditWorker.style.display = 'none';
      this.editingWorkerId = null;
    });

    formAddWorker?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('input-worker-name') as HTMLInputElement)?.value.trim();
      const documentId = (document.getElementById('input-worker-dni') as HTMLInputElement)?.value.trim();
      const contractStatus = (document.getElementById('select-worker-contract') as HTMLSelectElement)?.value;
      const assignedWorkCenterId = (document.getElementById('select-worker-center') as HTMLSelectElement)?.value || undefined;

      await withLoader(async () => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
          const res = await fetch('/api/workers', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name, documentId, contractStatus, assignedWorkCenterId })
          });
          if (!res.ok) throw new Error('Error al registrar trabajador');
          const created = await res.json();
          AppState.workers.push(created);
          this.renderWorkers();
          if (modalAddWorker) modalAddWorker.style.display = 'none';
          showToast('Trabajador añadido con éxito', 'success');
          document.dispatchEvent(new CustomEvent('app:master-data-changed'));
        } catch (err: any) {
          showToast(err.message, 'danger');
        }
      }, 'Añadiendo trabajador...');
    });

    formEditWorker?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.editingWorkerId) return;

      const name = (document.getElementById('input-edit-worker-name') as HTMLInputElement)?.value.trim();
      const documentId = (document.getElementById('input-edit-worker-dni') as HTMLInputElement)?.value.trim();
      const contractStatus = (document.getElementById('select-edit-worker-contract') as HTMLSelectElement)?.value;
      const assignedWorkCenterId = (document.getElementById('select-edit-worker-center') as HTMLSelectElement)?.value || undefined;
      const active = (document.getElementById('select-edit-worker-active') as HTMLSelectElement)?.value === 'true';

      await withLoader(async () => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
          const res = await fetch(`/api/workers/${this.editingWorkerId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name, documentId, contractStatus, assignedWorkCenterId, active })
          });
          if (!res.ok) throw new Error('Error al actualizar trabajador');
          const updated = await res.json();
          const idx = AppState.workers.findIndex(w => w.id === this.editingWorkerId);
          if (idx !== -1) AppState.workers[idx] = updated;

          this.renderWorkers();
          if (modalEditWorker) modalEditWorker.style.display = 'none';
          this.editingWorkerId = null;
          showToast('Datos del trabajador actualizados con éxito', 'success');
          document.dispatchEvent(new CustomEvent('app:master-data-changed'));
        } catch (err: any) {
          showToast(err.message, 'danger');
        }
      }, 'Actualizando trabajador...');
    });

    // Delegated edit & delete clicks
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Edit Center Button Click
      if (target.classList.contains('btn-edit-center') || target.closest('.btn-edit-center')) {
        const btn = target.classList.contains('btn-edit-center') ? target : target.closest('.btn-edit-center') as HTMLElement;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const center = AppState.workCenters.find(c => c.id === id);
        if (!center) return;

        this.editingCenterId = id;
        (document.getElementById('input-edit-center-name') as HTMLInputElement).value = center.name;
        (document.getElementById('input-edit-center-code') as HTMLInputElement).value = center.code;
        (document.getElementById('input-edit-center-address') as HTMLInputElement).value = center.address || '';
        (document.getElementById('input-edit-center-city') as HTMLInputElement).value = center.city || '';

        if (modalEditCenter) modalEditCenter.style.display = 'flex';
      }

      // Edit Worker Button Click
      if (target.classList.contains('btn-edit-worker') || target.closest('.btn-edit-worker')) {
        const btn = target.classList.contains('btn-edit-worker') ? target : target.closest('.btn-edit-worker') as HTMLElement;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const worker = AppState.workers.find(w => w.id === id);
        if (!worker) return;

        this.editingWorkerId = id;
        (document.getElementById('input-edit-worker-name') as HTMLInputElement).value = worker.name;
        (document.getElementById('input-edit-worker-dni') as HTMLInputElement).value = worker.documentId || '';
        (document.getElementById('select-edit-worker-contract') as HTMLSelectElement).value = worker.contractStatus || 'INDEFINIDO';

        const centerSelect = document.getElementById('select-edit-worker-center') as HTMLSelectElement;
        if (centerSelect) {
          centerSelect.innerHTML = '<option value="">-- Sin asignar --</option>' +
            AppState.workCenters.map(c => `
              <option value="${c.id}" ${c.id === worker.assignedWorkCenterId ? 'selected' : ''}>${c.name} (${c.code})</option>
            `).join('');
        }

        (document.getElementById('select-edit-worker-active') as HTMLSelectElement).value = worker.active ? 'true' : 'false';

        if (modalEditWorker) modalEditWorker.style.display = 'flex';
      }

      // Delete Center Button Click
      if (target.classList.contains('btn-delete-center') || target.closest('.btn-delete-center')) {
        const btn = target.classList.contains('btn-delete-center') ? target : target.closest('.btn-delete-center') as HTMLElement;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('¿Seguro que deseas eliminar este centro de trabajo?')) return;

        await withLoader(async () => {
          const headers: Record<string, string> = {};
          if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
          const res = await fetch(`/api/work-centers/${id}`, { method: 'DELETE', headers });
          if (res.ok) {
            AppState.workCenters = AppState.workCenters.filter(c => c.id !== id);
            this.renderWorkCenters();
            showToast('Centro de trabajo eliminado', 'info');
            document.dispatchEvent(new CustomEvent('app:master-data-changed'));
          }
        }, 'Eliminando centro...');
      }

      // Delete Worker Button Click
      if (target.classList.contains('btn-delete-worker') || target.closest('.btn-delete-worker')) {
        const btn = target.classList.contains('btn-delete-worker') ? target : target.closest('.btn-delete-worker') as HTMLElement;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('¿Seguro que deseas eliminar este trabajador y sus registros asociados?')) return;

        await withLoader(async () => {
          const headers: Record<string, string> = {};
          if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
          const res = await fetch(`/api/workers/${id}`, { method: 'DELETE', headers });
          if (res.ok) {
            AppState.workers = AppState.workers.filter(w => w.id !== id);
            this.renderWorkers();
            showToast('Trabajador eliminado', 'info');
            document.dispatchEvent(new CustomEvent('app:master-data-changed'));
          }
        }, 'Eliminando trabajador...');
      }
    });
  }
}
