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
          AppState.activeView = 'hub';
        } catch {
          sessionStorage.removeItem('SIM_AUTH_USER');
          sessionStorage.removeItem('SIM_AUTH_TOKEN');
          AppState.currentUser = null;
          AppState.activeView = 'login';
        }
      } else {
        AppState.currentUser = null;
        AppState.activeView = 'login';
      }
    } else {
      AppState.currentUser = null;
      AppState.activeView = 'login';
    }

    this.updateAuthUI();
    this.setupListeners();
  }

  public static setupListeners(): void {
    const form = document.getElementById('main-login-form') as HTMLFormElement;
    const btnLogout = document.getElementById('btn-logout');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = (document.getElementById('login-username-input') as HTMLInputElement)?.value.trim();
      const password = (document.getElementById('login-password-input') as HTMLInputElement)?.value.trim();
      const errorMsgEl = document.getElementById('login-error-alert');
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
          AppState.activeView = 'hub';

          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('SIM_AUTH_USER', JSON.stringify(data.user));
            sessionStorage.setItem('SIM_AUTH_TOKEN', data.token);
          }

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
      AppState.activeView = 'login';
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
    const userBadge = document.getElementById('user-badge');
    const userNameDisplay = document.getElementById('user-name-display');
    const btnLogout = document.getElementById('btn-logout');
    const viewLogin = document.getElementById('view-login');
    const viewHub = document.getElementById('view-hub');
    const viewForm = document.getElementById('view-form');
    const viewReport = document.getElementById('view-report');
    const viewMaster = document.getElementById('view-master');

    const sections = [viewLogin, viewHub, viewForm, viewReport, viewMaster];

    if (AppState.currentUser) {
      if (userBadge) userBadge.style.display = 'inline-flex';
      if (userNameDisplay) userNameDisplay.textContent = AppState.currentUser.name;
      if (btnLogout) btnLogout.style.display = 'inline-flex';

      // Hide login, show selected active view (default to hub)
      if (viewLogin) viewLogin.classList.remove('active');
      const targetViewId = `view-${AppState.activeView === 'login' ? 'hub' : AppState.activeView}`;
      sections.forEach(sec => {
        if (!sec) return;
        if (sec.id === targetViewId) {
          sec.classList.add('active');
        } else if (sec.id !== 'view-login') {
          sec.classList.remove('active');
        }
      });
    } else {
      if (userBadge) userBadge.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'none';

      // Force login screen only
      sections.forEach(sec => {
        if (!sec) return;
        if (sec.id === 'view-login') {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });
    }
  }
}
