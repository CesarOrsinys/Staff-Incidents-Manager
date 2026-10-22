import { AppState } from './ui/state/AppState.js';
import { LanguageManager } from './ui/i18n/LanguageManager.js';
import { AuthComponent } from './ui/components/AuthComponent.js';
import { MasterDataComponent } from './ui/components/MasterDataComponent.js';
import { IncidentFormComponent } from './ui/components/IncidentFormComponent.js';
import { MonthlyReportComponent } from './ui/components/MonthlyReportComponent.js';

export function navigateTo(targetView: 'login' | 'hub' | 'form' | 'report' | 'master'): void {
  AppState.activeView = targetView;
  const sections = document.querySelectorAll('.app-view-section');
  sections.forEach(sec => {
    if (sec.id === `view-${targetView}`) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  if (targetView === 'report') {
    MonthlyReportComponent.loadReport();
  } else if (targetView === 'form') {
    IncidentFormComponent.populateCenters();
  }
}

async function bootstrapApp() {
  // 1. Initialize i18n
  LanguageManager.init();

  // 2. Setup theme switching
  setupTheme();

  // 3. Load Master Data (Work Centers & Workers)
  await MasterDataComponent.loadData();
  MasterDataComponent.init();

  // 4. Initialize Form & Reports
  IncidentFormComponent.init();
  MonthlyReportComponent.init();

  // 5. Initialize Auth (determines whether to show login or hub)
  AuthComponent.init();

  // 6. Navigation Actions (Hub cards & back buttons)
  setupNavigation();

  // 7. Global reactive listeners
  document.addEventListener('app:master-data-changed', () => {
    IncidentFormComponent.populateCenters();
    MonthlyReportComponent.populateFilters();
    MonthlyReportComponent.loadReport();
  });

  document.addEventListener('app:incident-added', () => {
    MonthlyReportComponent.loadReport();
  });

  document.addEventListener('app:incident-deleted', () => {
    MonthlyReportComponent.loadReport();
  });

  document.addEventListener('app:auth-changed', () => {
    if (AppState.currentUser) {
      navigateTo('hub');
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
      IncidentFormComponent.populateCenters();
      MonthlyReportComponent.populateFilters();
      MonthlyReportComponent.loadReport();
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
