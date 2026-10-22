import { AppState } from './ui/state/AppState.js';
import { LanguageManager } from './ui/i18n/LanguageManager.js';
import { AuthComponent } from './ui/components/AuthComponent.js';
import { MasterDataComponent } from './ui/components/MasterDataComponent.js';
import { IncidentFormComponent } from './ui/components/IncidentFormComponent.js';
import { MonthlyReportComponent } from './ui/components/MonthlyReportComponent.js';

export function navigateTo(targetView: 'login' | 'hub' | 'form' | 'report' | 'master'): void {
  // If not authenticated, force login view and avoid any data fetching
  if (!AppState.currentUser && targetView !== 'login') {
    targetView = 'login';
  }

  AppState.activeView = targetView;
  const sections = document.querySelectorAll('.app-view-section');
  sections.forEach(sec => {
    if (sec.id === `view-${targetView}`) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  // Only load data when authenticated and when the active view requires it
  if (AppState.currentUser) {
    if (targetView === 'report') {
      MonthlyReportComponent.loadReport();
    } else if (targetView === 'form') {
      IncidentFormComponent.populateCenters();
    } else if (targetView === 'master') {
      MasterDataComponent.loadData();
    }
  }
}

async function bootstrapApp() {
  // 1. Initialize i18n
  LanguageManager.init();

  // 2. Setup theme switching
  setupTheme();

  // 3. Initialize components event listeners only (ZERO initial network requests)
  MasterDataComponent.init();
  IncidentFormComponent.init();
  MonthlyReportComponent.init();

  // 4. Initialize Auth (determines whether to show login or hub)
  AuthComponent.init();

  // 5. Navigation Actions (Hub cards & back buttons)
  setupNavigation();

  // 6. Global reactive listeners
  document.addEventListener('app:master-data-changed', () => {
    if (AppState.activeView === 'form') {
      IncidentFormComponent.populateCenters();
    } else if (AppState.activeView === 'report') {
      MonthlyReportComponent.loadReport();
    } else if (AppState.activeView === 'master') {
      MasterDataComponent.loadData();
    }
  });

  document.addEventListener('app:incident-added', () => {
    if (AppState.activeView === 'report') {
      MonthlyReportComponent.loadReport();
    }
  });

  document.addEventListener('app:incident-deleted', () => {
    if (AppState.activeView === 'report') {
      MonthlyReportComponent.loadReport();
    }
  });

  document.addEventListener('app:auth-changed', () => {
    if (AppState.currentUser) {
      navigateTo('hub');
      MasterDataComponent.loadData();
    } else {
      navigateTo('login');
    }
  });

  // Language selector
  const langSelect = document.getElementById('lang-selector') as HTMLSelectElement;
  if (langSelect) {
    langSelect.value = LanguageManager.getLanguage();
    langSelect.addEventListener('change', () => {
      LanguageManager.setLanguage(langSelect.value);
      if (AppState.activeView === 'form') {
        IncidentFormComponent.populateCenters();
      } else if (AppState.activeView === 'report') {
        MonthlyReportComponent.loadReport();
      }
    });
  }
}

function setupTheme(): void {
  const themeSelect = document.getElementById('theme-selector') as HTMLSelectElement;
  const savedTheme = localStorage.getItem('SIM_THEME') || 'dark';

  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', () => {
      const selected = themeSelect.value;
      document.documentElement.setAttribute('data-theme', selected);
      localStorage.setItem('SIM_THEME', selected);
    });
  }
}

function setupNavigation(): void {
  // Global navigate buttons
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-navigate]') as HTMLElement;
    if (target) {
      const dest = target.getAttribute('data-navigate') as any;
      if (dest) {
        navigateTo(dest);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapApp().catch(console.error);
});
