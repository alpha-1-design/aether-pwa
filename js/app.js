// Aether PWA - Main App Controller
class AetherApp {
  constructor() {
    this.currentView = 'chat';
    this.apiKeys = JSON.parse(localStorage.getItem('aether_api_keys') || '{}');
    this.init();
  }

  init() {
    this.initNavigation();
    this.initSettings();
    this.loadTheme();
    this.initModals();
    this.initToasts();
  }

  initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });
  }

  switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const viewEl = document.getElementById(`${view}View`);
    const navBtn = document.querySelector(`[data-view="${view}"]`);
    if (viewEl) viewEl.classList.add('active');
    if (navBtn) navBtn.classList.add('active');
    this.currentView = view;
  }

  initSettings() {
    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.settings-section');
        const content = section?.querySelector('.section-content');
        const chevron = header.querySelector('.chevron');
        if (!content) return;
        const isOpen = !content.classList.contains('hidden');
        content.classList.toggle('hidden', isOpen);
        header.classList.toggle('active', !isOpen);
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
      });
    });

    document.getElementById('saveApiKeyBtn')?.addEventListener('click', () => {
      const provider = document.getElementById('apiProviderSelect')?.value;
      const key = document.getElementById('apiKeyInput')?.value;
      if (provider && key) {
        this.apiKeys[provider] = key;
        localStorage.setItem('aether_api_keys', JSON.stringify(this.apiKeys));
        document.getElementById('apiKeyInput').value = '';
        this.renderSavedKeys();
        this.showToast('API key saved', 'success');
      }
    });

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme;
        document.body.setAttribute('data-theme', theme === 'space-dark' ? '' : theme);
        localStorage.setItem('aether-theme', theme);
      });
    });

    const savedTheme = localStorage.getItem('aether-theme');
    if (savedTheme && savedTheme !== 'space-dark') {
      document.body.setAttribute('data-theme', savedTheme);
      document.querySelector(`[data-theme="${savedTheme}"]`)?.classList.add('active');
    }
  }

  loadTheme() {
    const savedColor = localStorage.getItem('aether-soul-color');
    if (savedColor) {
      document.documentElement.style.setProperty('--color-primary', savedColor);
      const picker = document.getElementById('soulColorPicker');
      const hex = document.getElementById('soulColorHex');
      if (picker) picker.value = savedColor;
      if (hex) hex.textContent = savedColor.toUpperCase();
    }
  }

  initModals() {
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });
  }

  openModal() {
    document.getElementById('modalOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    document.getElementById('modalOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  initToasts() {
    if (!document.querySelector('.toast-container')) {
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }

  showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  renderSavedKeys() {
    const container = document.getElementById('savedKeys');
    if (!container) return;
    container.innerHTML = Object.keys(this.apiKeys).map(p =>
      `<div class="api-key-item">
        <span class="api-key-provider">${p}</span>
        <button class="text-btn" onclick="window.aetherApp.deleteKey('${p}')">Remove</button>
      </div>`
    ).join('');
  }

  deleteKey(provider) {
    delete this.apiKeys[provider];
    localStorage.setItem('aether_api_keys', JSON.stringify(this.apiKeys));
    this.renderSavedKeys();
    this.showToast('API key removed', 'success');
  }
}

window.aetherApp = new AetherApp();
