import { AppState } from '../state/AppState.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';

export class AuthComponent {
  public static init(): void {
    // Restore session if exists
    if (typeof sessionStorage !== 'undefined') {
      const savedUser = sessionStorage.getItem('SIM_AUTH_USER');
      const savedToken = sessionStorage.getItem('SIM_AUTH_TOKEN');
      if (savedUser && savedToken) {
        try {
          AppState.currentUser = JSON.parse(savedUser);
          AppState.authToken = savedToken;
        } catch (e) {
          sessionStorage.removeItem('SIM_AUTH_USER');
          sessionStorage.removeItem('SIM_AUTH_TOKEN');
        }
      }
    }

    this.updateAuthUI();
    this.setupListeners();
  }

  public static setupListeners(): void {
    const btnOpenLogin = document.getElementById('btn-open-login');
    const modal = document.getElementById('login-modal');
    const btnCloseModal = document.getElementById('btn-close-login');
    const form = document.getElementById('login-form') as HTMLFormElement;
    const btnLogout = document.getElementById('btn-logout');

    btnOpenLogin?.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
      const usernameInput = document.getElementById('input-username') as HTMLInputElement;
      if (usernameInput) {
        usernameInput.value = 'gerente';
        const passInput = document.getElementById('input-password') as HTMLInputElement;
        if (passInput) passInput.value = 'admin123';
        usernameInput.focus();
      }
    });

    btnCloseModal?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = (document.getElementById('input-username') as HTMLInputElement)?.value.trim();
      const password = (document.getElementById('input-password') as HTMLInputElement)?.value.trim();
      const errorMsgEl = document.getElementById('login-error-msg');
      if (errorMsgEl) errorMsgEl.style.display = 'none';

      await withLoader(async () => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'errInvalidCredentials');
          }

          AppState.currentUser = data.user;
          AppState.authToken = data.token;

          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('SIM_AUTH_USER', JSON.stringify(data.user));
            sessionStorage.setItem('SIM_AUTH_TOKEN', data.token);
          }

          if (modal) modal.style.display = 'none';
          this.updateAuthUI();

          const welcomeMsg = LanguageManager.t('toastLoginSuccess', { name: data.user.name });
          showToast(welcomeMsg, 'success');

          // Trigger view update
          document.dispatchEvent(new CustomEvent('app:auth-changed'));
        } catch (err: any) {
          if (errorMsgEl) {
            errorMsgEl.textContent = LanguageManager.t(err.message || 'errInvalidCredentials');
            errorMsgEl.style.display = 'block';
          }
        }
      }, 'Verificando credenciales...');
    });

    btnLogout?.addEventListener('click', () => {
      AppState.currentUser = null;
      AppState.authToken = null;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('SIM_AUTH_USER');
        sessionStorage.removeItem('SIM_AUTH_TOKEN');
      }
      this.updateAuthUI();
      showToast(LanguageManager.t('toastLogoutSuccess'), 'info');
      document.dispatchEvent(new CustomEvent('app:auth-changed'));
    });
  }

  public static updateAuthUI(): void {
    const btnOpenLogin = document.getElementById('btn-open-login');
    const userBadge = document.getElementById('user-badge');
    const userNameDisplay = document.getElementById('user-name-display');
    const btnLogout = document.getElementById('btn-logout');
    const lockOverlay = document.getElementById('auth-lock-overlay');

    if (AppState.currentUser) {
      if (btnOpenLogin) btnOpenLogin.style.display = 'none';
      if (userBadge) userBadge.style.display = 'inline-flex';
      if (userNameDisplay) userNameDisplay.textContent = AppState.currentUser.name;
      if (btnLogout) btnLogout.style.display = 'inline-flex';
      if (lockOverlay) lockOverlay.style.display = 'none';
    } else {
      if (btnOpenLogin) btnOpenLogin.style.display = 'inline-flex';
      if (userBadge) userBadge.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'none';
      if (lockOverlay) lockOverlay.style.display = 'flex';
    }
  }
}
