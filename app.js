/**
 * Aether PWA - Comprehensive JavaScript Utilities
 * Production-ready ES6+ utilities for AI-powered Progressive Web App
 * @version 1.0.0
 */

/* ============================================
   UTILITIES - Core Helpers
   ============================================ */

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @param {boolean} immediate - Execute immediately on first call
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Local storage with expiration support
 */
export class ExpirableStorage {
  constructor(prefix = 'aether_') {
    this.prefix = prefix;
  }

  set(key, value, ttlSeconds = 86400 * 30) {
    const item = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    };
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  }

  get(key) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) return null;
      
      const item = JSON.parse(raw);
      if (Date.now() > item.expiry) {
        this.remove(key);
        return null;
      }
      return item.value;
    } catch (e) {
      return null;
    }
  }

  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}

/* ============================================
   TOAST NOTIFICATION SYSTEM
   ============================================ */

export class ToastManager {
  constructor() {
    this.toasts = new Map();
    this.container = null;
    this.init();
  }

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      }
      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: var(--toast-bg, #1a1a2e);
        color: var(--toast-text, #fff);
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: system-ui, sans-serif;
        font-size: 14px;
        animation: toastSlideIn 0.3s ease;
        border-left: 4px solid var(--toast-accent, #6366f1);
      }
      .toast.toast-exit {
        animation: toastSlideOut 0.3s ease forwards;
      }
      .toast-icon { font-size: 18px; }
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: var(--toast-accent, #6366f1);
        transition: width linear;
      }
      @keyframes toastSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  show(message, options = {}) {
    const {
      type = 'info',
      duration = 4000,
      icon = this.getIcon(type)
    } = options;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      ${duration > 0 ? `<div class="toast-progress" style="width: 100%"></div>` : ''}
    `;

    this.container.appendChild(toast);
    const id = Date.now();
    this.toasts.set(id, toast);

    if (duration > 0) {
      const progress = toast.querySelector('.toast-progress');
      if (progress) {
        progress.style.transitionDuration = `${duration}ms`;
        progress.style.width = '0%';
      }
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  dismiss(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;
    
    toast.classList.add('toast-exit');
    setTimeout(() => {
      toast.remove();
      this.toasts.delete(id);
    }, 300);
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  success(msg, opts) { return this.show(msg, { ...opts, type: 'success' }); }
  error(msg, opts) { return this.show(msg, { ...opts, type: 'error' }); }
  warning(msg, opts) { return this.show(msg, { ...opts, type: 'warning' }); }
  info(msg, opts) { return this.show(msg, { ...opts, type: 'info' }); }
}

export const toast = new ToastManager();

/* ============================================
   MODAL MANAGER
   ============================================ */

export class ModalManager {
  constructor() {
    this.modals = new Map();
    this.zIndex = 1000;
    this.init();
  }

  init() {
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        z-index: var(--modal-z, 1000);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: modalFadeIn 0.2s ease;
      }
      .modal-overlay.closing {
        animation: modalFadeOut 0.2s ease forwards;
      }
      .modal-content {
        background: var(--modal-bg, #1a1a2e);
        color: var(--modal-text, #fff);
        border-radius: 16px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        animation: modalSlideIn 0.3s ease;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--modal-border, #333);
      }
      .modal-title { font-size: 18px; font-weight: 600; margin: 0; }
      .modal-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      .modal-close:hover { opacity: 1; }
      .modal-body { padding: 24px; }
      .modal-footer {
        padding: 16px 24px;
        border-top: 1px solid var(--modal-border, #333);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes modalSlideIn {
        from { transform: scale(0.95) translateY(-20px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  open(content, options = {}) {
    const {
      title = '',
      onClose = null,
      closeable = true,
      width = 'auto',
      showFooter = false,
      buttons = []
    } = options;

    const id = `modal_${Date.now()}`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.setProperty('--modal-z', ++this.zIndex);

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.style.width = typeof width === 'number' ? `${width}px` : width;

    modal.innerHTML = `
      ${title || closeable ? `
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          ${closeable ? '<button class="modal-close" aria-label="Close">×</button>' : ''}
        </div>
      ` : ''}
      <div class="modal-body">${typeof content === 'function' ? content() : content}</div>
      ${showFooter ? `<div class="modal-footer"></div>` : ''}
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => this.close(id);

    if (closeable) {
      overlay.querySelector('.modal-close')?.addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    if (showFooter && buttons.length) {
      const footer = modal.querySelector('.modal-footer');
      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `modal-btn modal-btn-${btn.type || 'secondary'}`;
        button.textContent = btn.text;
        button.addEventListener('click', () => {
          if (btn.onClick) btn.onClick();
          if (btn.closeOnClick !== false) close();
        });
        footer.appendChild(button);
      });
    }

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && closeable) {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    });

    this.modals.set(id, { overlay, onClose, closeable });
    return id;
  }

  close(id) {
    const modal = this.modals.get(id);
    if (!modal) return;

    modal.overlay.classList.add('closing');
    setTimeout(() => {
      modal.overlay.remove();
      if (modal.onClose) modal.onClose();
      this.modals.delete(id);
    }, 200);
  }

  closeAll() {
    this.modals.forEach((_, id) => this.close(id));
  }

  prompt(title, question, defaultValue = '') {
    return new Promise((resolve) => {
      const content = `
        <p style="margin-bottom: 16px; color: var(--modal-text-secondary, #aaa);">${question}</p>
        <input type="text" class="modal-input" value="${defaultValue}" 
          style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--modal-border, #444); background: var(--modal-input-bg, #0a0a1a); color: var(--modal-text, #fff); outline: none;">
      `;
      
      const id = this.open(content, {
        title,
        showFooter: true,
        buttons: [
          { text: 'Cancel', type: 'secondary', onClick: () => resolve(null) },
          { text: 'OK', type: 'primary', onClick: () => {
            const val = document.querySelector('.modal-input')?.value;
            resolve(val);
          }}
        ],
        onClose: () => resolve(null)
      });

      setTimeout(() => {
        const input = document.querySelector('.modal-input');
        input?.focus();
        input?.select();
      }, 100);
    });
  }

  confirm(title, message) {
    return new Promise((resolve) => {
      const content = `<p style="color: var(--modal-text-secondary, #aaa);">${message}</p>`;
      this.open(content, {
        title,
        showFooter: true,
        buttons: [
          { text: 'Cancel', type: 'secondary', onClick: () => resolve(false) },
          { text: 'Confirm', type: 'danger', onClick: () => resolve(true) }
        ],
        onClose: () => resolve(false)
      });
    });
  }
}

export const modal = new ModalManager();

/* ============================================
   THEME MANAGER
   ============================================ */

export class ThemeManager {
  constructor() {
    this.storage = new ExpirableStorage('theme_');
    this.themes = {
      dark: {
        name: 'Dark',
        vars: {
          '--bg-primary': '#0a0a1a',
          '--bg-secondary': '#1a1a2e',
          '--bg-tertiary': '#16213e',
          '--text-primary': '#ffffff',
          '--text-secondary': '#a0a0a0',
          '--accent': '#6366f1',
          '--accent-hover': '#818cf8',
          '--border': '#333',
          '--success': '#22c55e',
          '--warning': '#f59e0b',
          '--error': '#ef4444'
        }
      },
      light: {
        name: 'Light',
        vars: {
          '--bg-primary': '#ffffff',
          '--bg-secondary': '#f5f5f7',
          '--bg-tertiary': '#e8e8ed',
          '--text-primary': '#1a1a2e',
          '--text-secondary': '#6b6b7a',
          '--accent': '#6366f1',
          '--accent-hover': '#4f46e5',
          '--border': '#e0e0e0',
          '--success': '#16a34a',
          '--warning': '#d97706',
          '--error': '#dc2626'
        }
      },
      cosmic: {
        name: 'Cosmic',
        vars: {
          '--bg-primary': '#0f0118',
          '--bg-secondary': '#1a0a2e',
          '--bg-tertiary': '#2d1b4e',
          '--text-primary': '#e9e4f0',
          '--text-secondary': '#a89bc2',
          '--accent': '#a855f7',
          '--accent-hover': '#c084fc',
          '--border': '#4c1d95',
          '--success': '#34d399',
          '--warning': '#fbbf24',
          '--error': '#f87171'
        }
      }
    };
    this.current = this.loadTheme();
    this.apply(this.current);
  }

  loadTheme() {
    return this.storage.get('theme') || 'dark';
  }

  apply(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return;

    Object.entries(theme.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    
    document.documentElement.setAttribute('data-theme', themeName);
    this.storage.set('theme', themeName);
    this.current = themeName;
    
    window.dispatchEvent(new CustomEvent('themechange', { detail: themeName }));
  }

  toggle() {
    const names = Object.keys(this.themes);
    const idx = names.indexOf(this.current);
    const next = names[(idx + 1) % names.length];
    this.apply(next);
    return next;
  }

  getTheme() {
    return this.current;
  }

  getThemes() {
    return Object.entries(this.themes).map(([key, val]) => ({
      id: key,
      name: val.name
    }));
  }
}

export const theme = new ThemeManager();

/* ============================================
   NOTIFICATION SYSTEM (Browser)
   ============================================ */

export class NotificationSystem {
  constructor() {
    this.permission = Notification.permission || 'default';
    this.listeners = new Map();
  }

  async request() {
    if (this.permission === 'granted') return true;
    
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    }
    return false;
  }

  notify(title, options = {}) {
    const {
      body = '',
      icon = '/icon-192.png',
      tag = '',
      requireInteraction = false,
      silent = false
    } = options;

    if (this.permission !== 'granted') {
      toast.info(`${title}: ${body}`);
      return null;
    }

    const notification = new Notification(title, {
      body,
      icon,
      tag,
      requireInteraction,
      silent
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      const handlers = this.listeners.get('click');
      handlers?.forEach(cb => cb(notification));
    };

    notification.onclose = () => {
      const handlers = this.listeners.get('close');
      handlers?.forEach(cb => cb(notification));
    };

    return notification;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }
}

export const notifications = new NotificationSystem();

/* ============================================
   OFFLINE DETECTION
   ============================================ */

export class OfflineDetector {
  constructor() {
    this.online = navigator.onLine;
    this.listeners = new Set();
    this.init();
  }

  init() {
    window.addEventListener('online', () => this.handleChange(true));
    window.addEventListener('offline', () => this.handleChange(false));
  }

  handleChange(status) {
    this.online = status;
    this.listeners.forEach(cb => cb(status));
    window.dispatchEvent(new CustomEvent('networkchange', { detail: status }));
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isOnline() {
    return this.online;
  }
}

export const network = new OfflineDetector();

/* ============================================
   CLIPBOARD API WRAPPER
   ============================================ */

export const clipboard = {
  async copy(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      console.error('Copy failed:', e);
      return false;
    }
  },

  async read() {
    try {
      if (navigator.clipboard?.readText) {
        return await navigator.clipboard.readText();
      }
      return '';
    } catch (e) {
      return '';
    }
  }
};

/* ============================================
   URL QUERY PARAMS HANDLER
   ============================================ */

export const urlParams = {
  get(key, defaultValue = null) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(key);
    return value !== null ? value : defaultValue;
  },

  set(key, value) {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  },

  delete(key) {
    const params = new URLSearchParams(window.location.search);
    params.delete(key);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  },

  getAll() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  },

  toObject() {
    return this.getAll();
  }
};

/* ============================================
   AI SERVICE CLASS
   ============================================ */

export class AIService {
  constructor() {
    this.baseUrl = '';
    this.apiKeys = this.loadKeys();
    this.defaultModel = 'gpt-4';
    this.streamHandler = null;
  }

  loadKeys() {
    const storage = new ExpirableStorage('aether_keys_');
    return {
      openai: storage.get('openai') || '',
      anthropic: storage.get('anthropic') || '',
      google: storage.get('google') || ''
    };
  }

  saveKeys(keys) {
    const storage = new ExpirableStorage('aether_keys_');
    Object.entries(keys).forEach(([k, v]) => storage.set(k, v));
    this.apiKeys = keys;
  }

  async chat(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 4096,
      stream = false,
      system = ''
    } = options;

    const fullMessages = system 
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    if (this.baseUrl) {
      return this.proxyChat(fullMessages, options);
    }

    const provider = this.detectProvider(model);
    return this.callProvider(provider, 'chat', fullMessages, options);
  }

  detectProvider(model) {
    if (model.startsWith('gpt') || model.startsWith('o')) return 'openai';
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gemini')) return 'google';
    return 'openai';
  }

  async proxyChat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, ...options })
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    return response.json();
  }

  async callProvider(provider, endpoint, data, options = {}) {
    const endpoints = {
      openai: { url: 'https://api.openai.com/v1', path: '/chat/completions' },
      anthropic: { url: 'https://api.anthropic.com/v1', path: '/messages' },
      google: { url: 'https://generativelanguage.googleapis.com/v1', path: '/models' }
    };

    const config = endpoints[provider];
    if (!config) throw new Error(`Unknown provider: ${provider}`);

    const response = await fetch(`${config.url}${config.path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(provider)
      },
      body: JSON.stringify(this.formatRequest(provider, data, options))
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return this.parseResponse(provider, response);
  }

  getAuthHeaders(provider) {
    const headers = {};
    switch (provider) {
      case 'openai':
        if (this.apiKeys.openai) headers['Authorization'] = `Bearer ${this.apiKeys.openai}`;
        break;
      case 'anthropic':
        if (this.apiKeys.anthropic) headers['x-api-key'] = this.apiKeys.anthropic;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'google':
        if (this.apiKeys.google) headers['Authorization'] = `Bearer ${this.apiKeys.google}`;
        break;
    }
    return headers;
  }

  formatRequest(provider, messages, options = {}) {
    switch (provider) {
      case 'openai':
        return {
          model: options.model || 'gpt-4',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: options.stream ?? false
        };
      case 'anthropic':
        return {
          model: options.model || 'claude-3-sonnet-20240229',
          messages,
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
          stream: options.stream ?? false
        };
      default:
        return { messages, ...options };
    }
  }

  async parseResponse(provider, response) {
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return this.parseStream(response);
    }
    const data = await response.json();
    return this.extractMessage(provider, data);
  }

  extractMessage(provider, data) {
    switch (provider) {
      case 'openai':
        return { content: data.choices?.[0]?.message?.content || '', raw: data };
      case 'anthropic':
        return { content: data.content?.[0]?.text || '', raw: data };
      default:
        return { content: data.content || data.text || '', raw: data };
    }
  }

  async *parseStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = this.extractStreamContent(parsed);
            if (content) yield content;
          } catch (e) {}
        }
      }
    }
  }

  extractStreamContent(data) {
    if (data.choices?.[0]?.delta?.content) {
      return data.choices[0].delta.content;
    }
    if (data.content?.[0]?.text) {
      return data.content[0].text;
    }
    return '';
  }

  async search(query, options = {}) {
    const { limit = 10 } = options;
    
    if (this.baseUrl) {
      return fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`)
        .then(r => r.json());
    }

    return { results: [], query, message: 'Search not configured' };
  }

  async executeCode(code, language) {
    const languageHandlers = {
      javascript: this.executeJavaScript.bind(this),
      python: this.executePythonStub.bind(this),
      sql: this.executeSQLStub.bind(this)
    };

    const handler = languageHandlers[language.toLowerCase()];
    if (!handler) {
      return { success: false, error: `Unsupported language: ${language}` };
    }

    return handler(code);
  }

  executeJavaScript(code) {
    try {
      const logs = [];
      const mockConsole = {
        log: (...args) => logs.push(args.map(String).join(' ')),
        error: (...args) => logs.push(`Error: ${args.map(String).join(' ')}`),
        warn: (...args) => logs.push(`Warning: ${args.map(String).join(' ')}`)
      };

      const fn = new Function('console', code);
      fn(mockConsole);

      return {
        success: true,
        output: logs.join('\n'),
        logs
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  executePythonStub(code) {
    return {
      success: false,
      error: 'Python execution requires backend support',
      hint: 'Configure a backend server with Python sandbox'
    };
  }

  executeSQLStub(code) {
    return {
      success: false,
      error: 'SQL execution requires backend support',
      hint: 'Configure a backend server with SQL sandbox'
    };
  }

  async getModels() {
    return [
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic' },
      { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' },
      { id: 'gemini-ultra', name: 'Gemini Ultra', provider: 'google' }
    ];
  }

  async embed(text, options = {}) {
    const { model = 'text-embedding-ada-002' } = options;
    
    if (!this.apiKeys.openai && !this.baseUrl) {
      return { embedding: [], error: 'No API key or backend configured' };
    }

    if (this.baseUrl) {
      const response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model })
      });
      return response.json();
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKeys.openai}`
      },
      body: JSON.stringify({ input: text, model })
    });

    const data = await response.json();
    return { embedding: data.data?.[0]?.embedding || [] };
  }
}

export const aiService = new AIService();

/* ============================================
   CONVERSATION MANAGER
   ============================================ */

export class ConversationManager {
  constructor() {
    this.storage = new ExpirableStorage('conv_');
    this.currentId = null;
    this.listeners = new Set();
  }

  create(data = {}) {
    const id = this.generateId();
    const conversation = {
      id,
      title: data.title || `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      model: data.model || 'gpt-4',
      created: Date.now(),
      updated: Date.now(),
      starred: false,
      folder: null,
      tags: [],
      metadata: {}
    };

    this.save(conversation);
    this.currentId = id;
    this.emit('create', conversation);
    return conversation;
  }

  save(conversation) {
    conversation.updated = Date.now();
    this.storage.set(conversation.id, conversation);
  }

  get(id) {
    return this.storage.get(id);
  }

  getCurrent() {
    return this.currentId ? this.get(this.currentId) : null;
  }

  setCurrent(id) {
    this.currentId = id;
    this.emit('currentChange', id);
  }

  getAll() {
    const conversations = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('conv_') && !key.endsWith('_index')) {
        const conv = this.get(key.replace('conv_', ''));
        if (conv) conversations.push(conv);
      }
    }
    return conversations.sort((a, b) => b.updated - a.updated);
  }

  update(id, updates) {
    const conversation = this.get(id);
    if (!conversation) return null;

    Object.assign(conversation, updates, { updated: Date.now() });
    this.save(conversation);
    this.emit('update', conversation);
    return conversation;
  }

  delete(id) {
    this.storage.remove(id);
    if (this.currentId === id) {
      this.currentId = null;
    }
    this.emit('delete', id);
  }

  addMessage(conversationId, message) {
    const conversation = this.get(conversationId);
    if (!conversation) return null;

    const msg = {
      id: this.generateId(),
      role: message.role || 'user',
      content: message.content,
      timestamp: Date.now(),
      attachments: message.attachments || [],
      citations: message.citations || [],
      version: 1,
      versions: []
    };

    conversation.messages.push(msg);
    
    if (!conversation.title.startsWith('Chat') && conversation.messages.length === 1) {
      conversation.title = this.generateTitle(message.content);
    }

    this.save(conversation);
    this.emit('message', { conversation, message: msg });
    return msg;
  }

  updateMessage(conversationId, messageId, updates) {
    const conversation = this.get(conversationId);
    if (!conversation) return null;

    const msgIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return null;

    const msg = conversation.messages[msgIndex];
    
    if (updates.content && updates.content !== msg.content) {
      msg.versions.push({ content: msg.content, timestamp: msg.timestamp });
      msg.version++;
    }

    Object.assign(msg, updates, { timestamp: Date.now() });
    this.save(conversation);
    this.emit('messageUpdate', { conversation, message: msg });
    return msg;
  }

  deleteMessage(conversationId, messageId) {
    const conversation = this.get(conversationId);
    if (!conversation) return null;

    const index = conversation.messages.findIndex(m => m.id === messageId);
    if (index === -1) return null;

    conversation.messages.splice(index, 1);
    this.save(conversation);
    this.emit('messageDelete', { conversationId, messageId });
  }

  search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    this.getAll().forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.content.toLowerCase().includes(lowerQuery)) {
          results.push({
            conversation: conv,
            message: msg,
            relevance: this.calculateRelevance(msg.content, query)
          });
        }
      });
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  calculateRelevance(text, query) {
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    let score = 0;
    
    if (lower.includes(q)) score += 10;
    if (lower.startsWith(q)) score += 5;
    if (lower.split(' ').some(w => w.startsWith(q))) score += 3;
    
    return score;
  }

  export(conversationId, format = 'json') {
    const conversation = this.get(conversationId);
    if (!conversation) return null;

    switch (format) {
      case 'json':
        return JSON.stringify(conversation, null, 2);
      case 'markdown':
        return this.toMarkdown(conversation);
      case 'html':
        return this.toHTML(conversation);
      default:
        return JSON.stringify(conversation);
    }
  }

  toMarkdown(conv) {
    let md = `# ${conv.title}\n\n`;
    md += `**Model:** ${conv.model}\n`;
    md += `**Created:** ${new Date(conv.created).toLocaleString()}\n\n---\n\n`;

    conv.messages.forEach(msg => {
      md += `## ${msg.role === 'user' ? 'You' : 'Assistant'}\n\n`;
      md += `${msg.content}\n\n`;
    });

    return md;
  }

  toHTML(conv) {
    return `<!DOCTYPE html>
<html><head><title>${conv.title}</title>
<style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:20px}
.user{color:#6366f1}.assistant{color:#22c55e}pre{background:#f5f5f5;padding:16px;border-radius:8px}
</style></head><body>
<h1>${conv.title}</h1>
${conv.messages.map(m => `
<div><strong>${m.role === 'user' ? 'You' : 'Assistant'}:</strong>
${m.role === 'user' ? m.content : `<pre>${m.content}</pre>`}
</div>`).join('<hr>')}
</body></html>`;
  }

  import(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!parsed.messages || !Array.isArray(parsed.messages)) {
        throw new Error('Invalid conversation format');
      }

      const id = this.generateId();
      const conversation = {
        ...parsed,
        id,
        created: parsed.created || Date.now(),
        updated: Date.now(),
        imported: true
      };

      this.save(conversation);
      this.emit('import', conversation);
      return conversation;
    } catch (e) {
      throw new Error(`Import failed: ${e.message}`);
    }
  }

  branch(conversationId, fromMessageId, title = '') {
    const original = this.get(conversationId);
    if (!original) return null;

    const msgIndex = original.messages.findIndex(m => m.id === fromMessageId);
    if (msgIndex === -1) return null;

    const branch = this.create({
      title: title || `Branch of ${original.title}`,
      model: original.model
    });

    original.messages.slice(0, msgIndex + 1).forEach(msg => {
      this.addMessage(branch.id, {
        role: msg.role,
        content: msg.content
      });
    });

    this.update(conversationId, { 
      metadata: { ...original.metadata, branched: true } 
    });

    return branch;
  }

  generateId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTitle(content) {
    const clean = content.replace(/[^\w\s]/g, '').trim();
    return clean.split(' ').slice(0, 5).join(' ') + (clean.split(' ').length > 5 ? '...' : '');
  }

  on(event, callback) {
    this.listeners.add({ event, callback });
    return () => this.listeners.delete({ event, callback });
  }

  emit(event, data) {
    this.listeners.forEach(({ event: e, callback }) => {
      if (e === event || e === '*') callback(data);
    });
  }
}

export const conversations = new ConversationManager();

/* ============================================
   MEMORY SYSTEM
   ============================================ */

export class MemorySystem {
  constructor() {
    this.storage = new ExpirableStorage('memory_');
    this.categories = ['facts', 'preferences', 'projects', 'custom'];
  }

  add(content, category = 'facts', metadata = {}) {
    const memory = {
      id: this.generateId(),
      content,
      category,
      metadata,
      created: Date.now(),
      accessed: Date.now(),
      accessCount: 0,
      importance: metadata.importance || 5
    };

    this.storage.set(memory.id, memory);
    return memory;
  }

  get(id) {
    const memory = this.storage.get(id);
    if (memory) {
      memory.accessCount++;
      memory.accessed = Date.now();
      this.storage.set(id, memory);
    }
    return memory;
  }

  getAll(category = null) {
    const memories = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('memory_')) {
        const mem = this.storage.get(key.replace('memory_', ''));
        if (mem && (!category || mem.category === category)) {
          memories.push(mem);
        }
      }
    }
    return memories.sort((a, b) => b.importance - a.importance);
  }

  update(id, updates) {
    const memory = this.storage.get(id);
    if (!memory) return null;

    Object.assign(memory, updates);
    this.storage.set(id, memory);
    return memory;
  }

  delete(id) {
    this.storage.remove(id);
  }

  async search(query, limit = 5) {
    const lowerQuery = query.toLowerCase();
    const all = this.getAll();
    
    const scored = all.map(memory => ({
      memory,
      score: this.calculateScore(memory, lowerQuery)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

    return scored.map(item => item.memory);
  }

  calculateScore(memory, query) {
    const content = memory.content.toLowerCase();
    let score = 0;

    if (content.includes(query)) score += 10;
    if (content.startsWith(query)) score += 5;
    
    const words = query.split(' ');
    words.forEach(word => {
      if (content.includes(word)) score += 2;
    });

    score += memory.importance * 0.5;
    score += Math.log(memory.accessCount + 1);

    const age = Date.now() - memory.created;
    const daysOld = age / (1000 * 60 * 60 * 24);
    if (daysOld < 7) score *= 1.2;

    return score;
  }

  async suggest(context, limit = 3) {
    return this.search(context, limit);
  }

  export() {
    return this.getAll().map(m => ({
      content: m.content,
      category: m.category,
      metadata: m.metadata
    }));
  }

  import(data) {
    const imported = [];
    data.forEach(item => {
      const memory = this.add(item.content, item.category, item.metadata);
      imported.push(memory);
    });
    return imported;
  }

  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clear(category = null) {
    if (category) {
      this.getAll(category).forEach(m => this.delete(m.id));
    } else {
      this.storage.clear();
    }
  }
}

export const memory = new MemorySystem();

/* ============================================
   CODE EXECUTOR
   ============================================ */

export class CodeExecutor {
  constructor() {
    this.languages = {
      javascript: { name: 'JavaScript', mime: 'text/javascript' },
      python: { name: 'Python', mime: 'text/x-python' },
      sql: { name: 'SQL', mime: 'text/x-sql' },
      html: { name: 'HTML', mime: 'text/html' },
      css: { name: 'CSS', mime: 'text/css' }
    };
    this.highlighters = new Map();
  }

  async highlight(code, language) {
    if (this.highlighters.has(language)) {
      return this.highlighters.get(language)(code);
    }
    return this.basicHighlight(code, language);
  }

  basicHighlight(code, language) {
    const patterns = {
      javascript: [
        [/\b(const|let|var|function|return|if|else|for|while|class|import|export|async|await)\b/g, 'keyword'],
        [/"[^"]*"|'[^']*'|`[^`]*`/g, 'string'],
        [/\/\/.*|\/\*[\s\S]*?\*\//g, 'comment'],
        [/\b\d+\b/g, 'number']
      ],
      python: [
        [/\b(def|class|return|if|else|for|while|import|from|as|async|await)\b/g, 'keyword'],
        [/"""[\s\S]*?"""|'''[\s\S]*?'''|"[^"]*"|'[^']*'/g, 'string'],
        [/#.*/g, 'comment'],
        [/\b\d+\b/g, 'number']
      ]
    };

    const langPatterns = patterns[language] || patterns.javascript;
    let highlighted = this.escapeHtml(code);

    langPatterns.forEach(([pattern, className]) => {
      highlighted = highlighted.replace(pattern, `<span class="code-${className}">$&</span>`);
    });

    return highlighted;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async execute(code, language, options = {}) {
    const { timeout = 5000, container = null } = options;

    const startTime = performance.now();

    switch (language) {
      case 'javascript':
        return this.executeJavaScript(code, startTime, timeout);
      case 'html':
        return this.executeHTML(code, container);
      case 'css':
        return { success: true, output: 'CSS validated', logs: [] };
      default:
        return { success: false, error: `Execution not supported for ${language}` };
    }
  }

  executeJavaScript(code, startTime, timeout) {
    return new Promise((resolve) => {
      const logs = [];
      const errors = [];

      const timeoutId = setTimeout(() => {
        errors.push('Execution timed out');
        resolve({
          success: false,
          error: 'Execution timed out',
          logs,
          executionTime: timeout
        });
      }, timeout);

      try {
        const mockConsole = {
          log: (...args) => logs.push({ type: 'log', content: args.map(String).join(' ') }),
          error: (...args) => logs.push({ type: 'error', content: args.map(String).join(' ') }),
          warn: (...args) => logs.push({ type: 'warn', content: args.map(String).join(' ') }),
          info: (...args) => logs.push({ type: 'info', content: args.map(String).join(' ') }),
          table: (data) => logs.push({ type: 'table', content: JSON.stringify(data, null, 2) })
        };

        const mockWindow = {
          alert: (msg) => logs.push({ type: 'alert', content: msg })
        };

        const fn = new Function('console', 'window', code);
        const result = fn(mockConsole, mockWindow);

        clearTimeout(timeoutId);

        resolve({
          success: true,
          output: result !== undefined ? String(result) : '',
          logs,
          returnValue: result,
          executionTime: Math.round(performance.now() - startTime)
        });
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: error.message,
          stack: error.stack,
          logs,
          executionTime: Math.round(performance.now() - startTime)
        });
      }
    });
  }

  executeHTML(code, container) {
    if (!container) {
      return { success: false, error: 'No container provided for HTML preview' };
    }

    try {
      container.innerHTML = code;
      return {
        success: true,
        output: 'HTML rendered',
        logs: []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: []
      };
    }
  }

  formatOutput(logs) {
    return logs.map(log => {
      const icon = { log: '›', error: '✕', warn: '⚠', info: 'ℹ' }[log.type] || '›';
      return `<span class="log-${log.type}">${icon} ${log.content}</span>`;
    }).join('\n');
  }
}

export const codeExecutor = new CodeExecutor();

/* ============================================
   ARTIFACT SYSTEM (Claude-style)
   ============================================ */

export class ArtifactSystem {
  constructor() {
    this.artifacts = new Map();
    this.types = ['html', 'react', 'svg', 'mermaid', 'markdown', 'vega-lite'];
  }

  create(type, code, metadata = {}) {
    const id = `artifact_${Date.now()}`;
    
    const artifact = {
      id,
      type,
      code,
      metadata: {
        title: metadata.title || 'Untitled',
        language: metadata.language || type,
        created: Date.now(),
        updated: Date.now(),
        ...metadata
      }
    };

    this.artifacts.set(id, artifact);
    return artifact;
  }

  get(id) {
    return this.artifacts.get(id);
  }

  update(id, code) {
    const artifact = this.artifacts.get(id);
    if (!artifact) return null;

    artifact.code = code;
    artifact.metadata.updated = Date.now();
    return artifact;
  }

  delete(id) {
    this.artifacts.delete(id);
  }

  render(artifact, container) {
    if (!container) return;

    switch (artifact.type) {
      case 'html':
      case 'react':
        this.renderHTML(artifact.code, container);
        break;
      case 'svg':
        this.renderSVG(artifact.code, container);
        break;
      case 'mermaid':
        this.renderMermaid(artifact.code, container);
        break;
      case 'markdown':
        this.renderMarkdown(artifact.code, container);
        break;
      default:
        container.textContent = artifact.code;
    }
  }

  renderHTML(code, container) {
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts';
    iframe.style.cssText = 'width:100%;height:100%;border:none;border-radius:8px;';
    
    container.innerHTML = '';
    container.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(code);
    doc.close();

    return iframe;
  }

  renderSVG(code, container) {
    container.innerHTML = code;
    const svg = container.querySelector('svg');
    if (svg) {
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
    }
  }

  renderMermaid(code, container) {
    container.innerHTML = `<pre class="mermaid">${code}</pre>`;
    if (window.mermaid) {
      window.mermaid.init(container);
    }
  }

  renderMarkdown(code, container) {
    const html = this.parseMarkdown(code);
    container.innerHTML = html;
  }

  parseMarkdown(text) {
    return text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  export(artifact) {
    return {
      type: artifact.type,
      code: artifact.code,
      metadata: artifact.metadata
    };
  }

  exportAll() {
    return Array.from(this.artifacts.values()).map(a => this.export(a));
  }

  import(data) {
    return this.create(data.type, data.code, data.metadata);
  }
}

export const artifacts = new ArtifactSystem();

/* ============================================
   TEMPLATES ENGINE
   ============================================ */

export class TemplatesEngine {
  constructor() {
    this.storage = new ExpirableStorage('template_');
    this.categories = ['coding', 'writing', 'analysis', 'research', 'creative', 'ghana', 'startup'];
    this.defaultTemplates = this.getDefaults();
    this.init();
  }

  init() {
    if (!this.storage.get('initialized')) {
      this.defaultTemplates.forEach(t => this.save(t));
      this.storage.set('initialized', true);
    }
  }

  getDefaults() {
    return [
      {
        id: 'code_review',
        name: 'Code Review',
        category: 'coding',
        prompt: 'Review this code for:\n1. Security issues\n2. Performance problems\n3. Code quality\n4. Best practices\n\n```\n{{code}}\n```\n\nLanguage: {{language}}',
        variables: ['code', 'language']
      },
      {
        id: 'explain_code',
        name: 'Explain Code',
        category: 'coding',
        prompt: 'Explain this {{language}} code step by step:\n\n```{{language}}\n{{code}}\n```',
        variables: ['language', 'code']
      },
      {
        id: 'writing_assistant',
        name: 'Writing Assistant',
        category: 'writing',
        prompt: 'Help me write a {{style}} about {{topic}}.\n\nTarget audience: {{audience}}\nLength: {{length}}',
        variables: ['style', 'topic', 'audience', 'length']
      },
      {
        id: 'data_analysis',
        name: 'Data Analysis',
        category: 'analysis',
        prompt: 'Analyze this dataset and provide insights:\n\n{{data}}\n\nFocus on: {{focus}}',
        variables: ['data', 'focus']
      },
      {
        id: 'research_summary',
        name: 'Research Summary',
        category: 'research',
        prompt: 'Summarize the key findings from this text:\n\n{{text}}\n\nInclude:\n- Main points\n- Supporting evidence\n- Implications',
        variables: ['text']
      },
      {
        id: 'brainstorm',
        name: 'Brainstorming',
        category: 'creative',
        prompt: 'Brainstorm creative ideas for {{topic}}.\n\nConstraints: {{constraints}}\n\nGenerate {{count}} diverse ideas.',
        variables: ['topic', 'constraints', 'count']
      }
    ];
  }

  save(template) {
    const id = template.id || `tpl_${Date.now()}`;
    template.id = id;
    template.created = template.created || Date.now();
    template.updated = Date.now();
    
    this.storage.set(id, template);
    return template;
  }

  get(id) {
    return this.storage.get(id);
  }

  getAll(category = null) {
    const templates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('template_')) {
        const tpl = this.storage.get(key.replace('template_', ''));
        if (tpl && (!category || tpl.category === category)) {
          templates.push(tpl);
        }
      }
    }
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  delete(id) {
    this.storage.remove(id);
  }

  render(template, variables = {}) {
    let prompt = template.prompt;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, value || `{{${key}}}`);
    });

    const missing = prompt.match(/\{\{([^}]+)\}\}/g);
    return { prompt, missing: missing || [] };
  }

  extractVariables(template) {
    const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  }

  exportTemplates(templates = null) {
    const toExport = templates || this.getAll();
    return JSON.stringify(toExport, null, 2);
  }

  importTemplates(jsonString) {
    try {
      const templates = JSON.parse(jsonString);
      const imported = [];
      
      templates.forEach(tpl => {
        delete tpl.id;
        delete tpl.created;
        const saved = this.save(tpl);
        imported.push(saved);
      });
      
      return imported;
    } catch (e) {
      throw new Error(`Import failed: ${e.message}`);
    }
  }

  getCategories() {
    return this.categories;
  }
}

export const templates = new TemplatesEngine();

/* ============================================
   MULTI-AGENT SYSTEM
   ============================================ */

export class MultiAgentSystem {
  constructor(aiService) {
    this.aiService = aiService;
    this.agents = new Map();
    this.tasks = new Map();
    this.builtInAgents = this.defineBuiltInAgents();
  }

  defineBuiltInAgents() {
    return {
      researcher: {
        name: 'Researcher',
        role: 'You are a thorough researcher. Find accurate information, cite sources, and provide comprehensive analysis.',
        capabilities: ['web-search', 'analysis', 'summarization'],
        model: 'gpt-4'
      },
      coder: {
        name: 'Coder',
        role: 'You are an expert programmer. Write clean, efficient, well-documented code. Consider edge cases and best practices.',
        capabilities: ['code-generation', 'code-review', 'debugging'],
        model: 'gpt-4'
      },
      creative: {
        name: 'Creative',
        role: 'You are a creative writer and brainstormer. Generate innovative ideas and think outside the box.',
        capabilities: ['brainstorming', 'writing', ' ideation'],
        model: 'gpt-4'
      },
      analyst: {
        name: 'Analyst',
        role: 'You are a data analyst. Break down complex problems, identify patterns, and provide data-driven insights.',
        capabilities: ['data-analysis', 'pattern-recognition', 'visualization'],
        model: 'gpt-4'
      },
      reviewer: {
        name: 'Reviewer',
        role: 'You are a critical reviewer. Provide constructive feedback, identify weaknesses, and suggest improvements.',
        capabilities: ['review', 'critique', 'feedback'],
        model: 'gpt-4'
      }
    };
  }

  createAgent(config) {
    const id = `agent_${Date.now()}`;
    
    const agent = {
      id,
      name: config.name || 'Agent',
      role: config.role || 'You are a helpful AI assistant.',
      capabilities: config.capabilities || [],
      model: config.model || 'gpt-4',
      status: 'idle',
      created: Date.now(),
      history: []
    };

    this.agents.set(id, agent);
    return agent;
  }

  createBuiltInAgent(type) {
    const config = this.builtInAgents[type];
    if (!config) throw new Error(`Unknown agent type: ${type}`);
    return this.createAgent(config);
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  async execute(agentId, task, options = {}) {
    const agent = this.getAgent(agentId);
    if (!agent) throw new Error('Agent not found');

    const taskId = `task_${Date.now()}`;
    const taskData = {
      id: taskId,
      agentId,
      task,
      status: 'running',
      started: Date.now(),
      result: null,
      error: null
    };

    this.tasks.set(taskId, taskData);
    agent.status = 'working';

    try {
      const messages = [
        { role: 'system', content: agent.role },
        { role: 'user', content: task }
      ];

      const response = await this.aiService.chat(messages, {
        model: agent.model,
        ...options
      });

      taskData.result = response.content;
      taskData.status = 'completed';
      taskData.completed = Date.now();
      agent.status = 'idle';
      agent.history.push({ task, response: response.content, timestamp: Date.now() });

      return taskData;
    } catch (error) {
      taskData.error = error.message;
      taskData.status = 'failed';
      taskData.completed = Date.now();
      agent.status = 'idle';

      return taskData;
    }
  }

  async executeParallel(tasks, options = {}) {
    const promises = tasks.map(({ agentId, task }) => 
      this.execute(agentId, task, options)
    );

    return Promise.all(promises);
  }

  aggregateResults(results) {
    return {
      total: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed').length,
      results: results.map(r => ({
        taskId: r.id,
        success: r.status === 'completed',
        content: r.result || r.error
      }))
    };
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  getAgentTasks(agentId) {
    return Array.from(this.tasks.values())
      .filter(t => t.agentId === agentId)
      .sort((a, b) => b.started - a.started);
  }

  removeAgent(id) {
    this.agents.delete(id);
  }
}

export const multiAgent = new MultiAgentSystem(aiService);

/* ============================================
   REAL-TIME COLLABORATION (Stub)
   ============================================ */

export class CollaborationSystem {
  constructor() {
    this.connected = false;
    this.users = new Map();
    this.cursors = new Map();
    this.handlers = new Map();
    this.ws = null;
  }

  connect(roomId, user) {
    console.log(`[Collaboration] Connecting to room: ${roomId}`);
    
    this.connected = true;
    this.currentRoom = roomId;
    this.currentUser = user;
    this.users.set(user.id, { ...user, status: 'online' });

    this.emit('connected', { roomId, user });
    
    return Promise.resolve({ success: true, roomId });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.connected = false;
    this.users.clear();
    this.cursors.clear();
    this.emit('disconnected', {});
  }

  sendCursor(position) {
    if (!this.connected) return;
    this.emit('cursorUpdate', {
      userId: this.currentUser.id,
      position
    });
  }

  sendUpdate(type, data) {
    if (!this.connected) return;

    const message = {
      type,
      data,
      userId: this.currentUser.id,
      timestamp: Date.now()
    };

    this.emit('send', message);
  }

  broadcast(message) {
    this.users.forEach((user, id) => {
      if (id !== this.currentUser.id) {
        this.emit('receive', { ...message, to: id });
      }
    });
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event).add(handler);
    return () => this.handlers.get(event).delete(handler);
  }

  emit(event, data) {
    const handlers = this.handlers.get(event);
    handlers?.forEach(h => h(data));
  }

  getUsers() {
    return Array.from(this.users.values());
  }

  getPresence() {
    return {
      online: this.users.size,
      users: this.getUsers()
    };
  }
}

export const collaboration = new CollaborationSystem();

/* ============================================
   ADVANCED FEATURES
   ============================================ */

/* Token Counter */
export class TokenCounter {
  constructor() {
    this.avgCharsPerToken = 4;
  }

  estimate(text) {
    if (!text) return 0;
    return Math.ceil(text.length / this.avgCharsPerToken);
  }

  estimateMessages(messages) {
    return messages.reduce((sum, msg) => {
      return sum + this.estimate(msg.content);
    }, 0);
  }

  getCost(messages, model = 'gpt-4') {
    const tokens = this.estimateMessages(messages);
    const pricing = this.getPricing(model);
    
    const inputCost = (tokens * pricing.input) / 1000;
    const outputCost = (tokens * pricing.output) / 1000;
    
    return {
      tokens,
      inputCost: inputCost.toFixed(6),
      outputCost: outputCost.toFixed(6),
      totalCost: (inputCost + outputCost).toFixed(6)
    };
  }

  getPricing(model) {
    const pricing = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    };
    return pricing[model] || pricing['gpt-4'];
  }
}

export const tokenCounter = new TokenCounter();

/* Citation Tracker */
export class CitationTracker {
  constructor() {
    this.citations = new Map();
  }

  add(citation) {
    const id = `cite_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const cite = {
      id,
      text: citation.text,
      source: citation.source,
      url: citation.url,
      accessed: Date.now(),
      metadata: citation.metadata || {}
    };
    this.citations.set(id, cite);
    return cite;
  }

  get(id) {
    return this.citations.get(id);
  }

  format(citation, style = 'footnote') {
    switch (style) {
      case 'footnote':
        return `[${citation.text}]`;
      case 'apa':
        return `(${citation.source}, ${new Date(citation.accessed).getFullYear()})`;
      case 'mla':
        return `"${citation.text}" ${citation.source}.`;
      default:
        return citation.text;
    }
  }

  getAll() {
    return Array.from(this.citations.values());
  }
}

export const citations = new CitationTracker();

/* Keyboard Shortcuts */
export class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => this.handle(e));
  }

  register(key, handler, options = {}) {
    const id = options.id || key;
    this.shortcuts.set(id, {
      key,
      handler,
      ctrl: options.ctrl || false,
      shift: options.shift || false,
      alt: options.alt || false,
      meta: options.meta || false
    });
    return () => this.shortcuts.delete(id);
  }

  handle(e) {
    if (!this.enabled) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    this.shortcuts.forEach((shortcut, id) => {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
      const shiftMatch = !!shortcut.shift === e.shiftKey;
      const altMatch = !!shortcut.alt === e.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        shortcut.handler(e);
      }
    });
  }

  disable() { this.enabled = false; }
  enable() { this.enabled = true; }

  getShortcuts() {
    return Array.from(this.shortcuts.entries()).map(([id, s]) => ({
      id,
      ...s
    }));
  }
}

export const shortcuts = new KeyboardShortcuts();

/* Voice Input */
export class VoiceInput {
  constructor() {
    this.recognition = null;
    this.listening = false;
    this.onResult = null;
    this.onError = null;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      
      if (this.onResult) this.onResult(transcript, e.results[e.results.length - 1].isFinal);
    };

    this.recognition.onerror = (e) => {
      if (this.onError) this.onError(e.error);
    };

    this.recognition.onend = () => {
      if (this.listening) {
        this.recognition.start();
      }
    };
  }

  start(onResult, onError) {
    if (!this.recognition) return false;

    this.onResult = onResult;
    this.onError = onError;
    this.listening = true;
    this.recognition.start();
    return true;
  }

  stop() {
    if (!this.recognition) return;
    this.listening = false;
    this.recognition.stop();
  }

  isSupported() {
    return !!this.recognition;
  }
}

export const voiceInput = new VoiceInput();

/* Drag and Drop File Handler */
export class FileHandler {
  constructor() {
    this.handlers = new Map();
    this.maxSize = 10 * 1024 * 1024;
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  handleDrop(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
      const type = this.detectType(file);
      const handler = this.handlers.get(type);
      
      if (handler) {
        handler(file, type);
      } else {
        this.defaultHandler(file, type);
      }
    });
  }

  detectType(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('text/')) return 'text';
    if (file.type === 'application/json') return 'json';
    if (file.name.endsWith('.pdf')) return 'pdf';
    if (file.name.endsWith('.md')) return 'markdown';
    return 'binary';
  }

  defaultHandler(file, type) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target.result;
      console.log(`File loaded (${type}):`, file.name, content);
    };

    if (type === 'text' || type === 'json' || type === 'markdown') {
      reader.readAsText(file);
    } else if (type === 'image') {
      reader.readAsDataURL(file);
    }
  }

  setMaxSize(bytes) {
    this.maxSize = bytes;
  }
}

export const fileHandler = new FileHandler();

/* ============================================
   MAIN EXPORTS
   ============================================ */

export const aetherPWA = {
  ai: aiService,
  conversations,
  memory,
  codeExecutor,
  artifacts,
  templates,
  agents: multiAgent,
  collaboration,
  tokenCounter,
  citations,
  shortcuts,
  voiceInput,
  fileHandler,
  toast,
  modal,
  theme,
  notifications,
  network,
  clipboard,
  urlParams,
  debounce,
  throttle,
  storage: new ExpirableStorage()
};

export default aetherPWA;
