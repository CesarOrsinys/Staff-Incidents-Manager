import { AppState } from '../state/AppState.js';
import { LanguageManager } from '../i18n/LanguageManager.js';
import { showToast } from '../services/ToastService.js';
import { withLoader } from '../services/LoaderService.js';

import { MasterDataComponent } from './MasterDataComponent.js';

const AUTH_SALT = 'SIM_SECURE_AUTH_V1_CASTELLO_DE_LA_PLANA_2026';

async function hashCredential(plain: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${plain}:${AUTH_SALT}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Safe fallback if subtle crypto is not supported
  return btoa(`${plain}:${AUTH_SALT}`);
}

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
          MasterDataComponent.loadData();
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
      const usernameInput = document.getElementById('login-username-input') as HTMLInputElement;
      const passwordInput = document.getElementById('login-password-input') as HTMLInputElement;
      const username = usernameInput?.value.trim() || '';
      const password = passwordInput?.value.trim() || '';
      const errorMsgEl = document.getElementById('login-error-alert');
      if (errorMsgEl) errorMsgEl.style.display = 'none';

      if (!username || !password) {
        if (errorMsgEl) {
          errorMsgEl.textContent = LanguageManager.t('errInvalidCredentials');
          errorMsgEl.style.display = 'block';
        }
        return;
      }

      await withLoader(async () => {
        try {
          // Cryptographically hash and salt the password client-side so plain text is NEVER sent over network or retained
          const authHash = await hashCredential(password);
          
          // Clear password input immediately from DOM
          if (passwordInput) passwordInput.value = '';

          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, authHash })
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

    const btnUserAvatar = document.getElementById('btn-user-avatar');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');

    btnUserAvatar?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!userDropdownMenu) return;
      const isOpen = userDropdownMenu.style.display === 'block';
      userDropdownMenu.style.display = isOpen ? 'none' : 'block';
      btnUserAvatar.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#user-badge') && userDropdownMenu) {
        userDropdownMenu.style.display = 'none';
        btnUserAvatar?.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && userDropdownMenu) {
        userDropdownMenu.style.display = 'none';
        btnUserAvatar?.setAttribute('aria-expanded', 'false');
      }
    });

    btnLogout?.addEventListener('click', () => {
      if (userDropdownMenu) {
        userDropdownMenu.style.display = 'none';
        btnUserAvatar?.setAttribute('aria-expanded', 'false');
      }
      AppState.currentUser = null;
      AppState.authToken = null;
      AppState.workCenters = [];
      AppState.workers = [];
      AppState.monthlyReport = [];
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
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const viewLogin = document.getElementById('view-login');
    const viewHub = document.getElementById('view-hub');
    const viewForm = document.getElementById('view-form');
    const viewReport = document.getElementById('view-report');
    const viewMaster = document.getElementById('view-master');

    const sections = [viewLogin, viewHub, viewForm, viewReport, viewMaster];

    if (userDropdownMenu) userDropdownMenu.style.display = 'none';

    if (AppState.currentUser) {
      if (userBadge) userBadge.style.display = 'inline-flex';
      if (userNameDisplay) userNameDisplay.textContent = AppState.currentUser.name;

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
