import { AppState } from './ui/state/AppState.js';
import { LanguageManager } from './ui/i18n/LanguageManager.js';
import { AuthComponent } from './ui/components/AuthComponent.js';
import { MasterDataComponent } from './ui/components/MasterDataComponent.js';
import { IncidentFormComponent } from './ui/components/IncidentFormComponent.js';
import { MonthlyReportComponent } from './ui/components/MonthlyReportComponent.js';

async function bootstrapApp() {
  // 1. Initialize i18n
  LanguageManager.init();

  // 2. Setup theme switching
  setupTheme();

  // 3. Initialize Auth
  AuthComponent.init();

  // 4. Load Master Data (Work Centers & Workers)
  await MasterDataComponent.loadData();
  MasterDataComponent.init();

  // 5. Initialize Form & Reports
  IncidentFormComponent.init();
  MonthlyReportComponent.init();

  // 6. Navigation Tabs
  setupNavigation();

  // 7. Global reactive listeners
  document.addEventListener('app:master-data-changed', () => {
    IncidentFormComponent.populateSelectors();
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
    MonthlyReportComponent.loadReport();
  });

  // Language selector
  const langSelect = document.getElementById('lang-selector') as HTMLSelectElement;
  if (langSelect) {
    langSelect.value = LanguageManager.getLanguage();
    langSelect.addEventListener('change', () => {
      LanguageManager.setLanguage(langSelect.value);
      IncidentFormComponent.populateSelectors();
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
  const navButtons = document.querySelectorAll('.nav-tab-btn');
  const sections = document.querySelectorAll('.app-view-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      if (!targetView) return;

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      sections.forEach(sec => {
        if (sec.id === `view-${targetView}`) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });

      if (targetView === 'report') {
        MonthlyReportComponent.loadReport();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapApp().catch(console.error);
});
