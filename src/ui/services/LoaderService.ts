export function showLoader(message: string = 'Procesando...'): void {
  if (typeof document === 'undefined') return;

  let loader = document.getElementById('app-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'app-loader';
    loader.className = 'app-loader-backdrop';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="loader-spinner"></div>
        <div class="loader-text" id="loader-text">${message}</div>
      </div>
    `;
    document.body.appendChild(loader);
  } else {
    const textEl = document.getElementById('loader-text');
    if (textEl) textEl.textContent = message;
    loader.style.display = 'flex';
  }
}

export function hideLoader(): void {
  if (typeof document === 'undefined') return;
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.display = 'none';
  }
}

export async function withLoader<T>(action: () => Promise<T>, message?: string): Promise<T> {
  try {
    showLoader(message);
    return await action();
  } finally {
    hideLoader();
  }
}
