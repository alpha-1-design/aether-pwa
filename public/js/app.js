// Aether PWA - Main App (Reborn v1.0.0)
import { initStore, getSettingAsync } from './store.js';
import { initAPI } from './api.js';
import { initChat } from './chat.js';
import { initAgents } from './agents.js';
import { initSettings } from './settings.js';
import { initSync } from './sync.js';

class AetherApp {
    constructor() {
        this.elements = {};
        this.store = null;
        this.api = null;
        this.currentView = 'chat';
        this.currentProvider = 'openrouter';
        this.currentModel = 'deepseek/deepseek-chat';
    }

    async init() {
        this.cacheElements();
        
        if (this.elements.splash) {
            this.elements.splash.style.display = 'none';
        }
        if (this.elements.app) {
            this.elements.app.style.display = 'flex';
        }
        
        try {
            await this.loadSettings();
            await this.initStore();
            this.initAPI();
            this.initComponents();
            this.bindEvents();
            this.registerSW();
            console.log('%c Aether Reborn v1.0.0 ', 'background: #6366f1; color: white; padding: 4px 8px; border-radius: 4px;');
        } catch (e) {
            console.error('Init error:', e);
        }
    }

    cacheElements() {
        this.elements = {
            splash: document.getElementById('splash'),
            app: document.getElementById('app'),
            chatView: document.getElementById('chatView'),
            agentsView: document.getElementById('agentsView'),
            settingsView: document.getElementById('settingsView'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            messages: document.getElementById('messages'),
            personaSelect: document.getElementById('personaSelect'),
            navBtns: document.querySelectorAll('.nav-btn'),
        };
    }

    async loadSettings() {
        const theme = await getSettingAsync('theme') || 'space-dark';
        const fontSize = await getSettingAsync('fontSize') || '16';
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-font-size', fontSize);
    }

    async initStore() {
        this.store = await initStore();
    }

    initAPI() {
        this.api = initAPI(this.store);
    }

    initComponents() {
        initChat(this);
        initAgents(this);
        initSettings(this);
        initSync(this);
    }

    bindEvents() {
        this.elements.navBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        window.addEventListener('error', (e) => this.handleGlobalError(e));
        window.addEventListener('unhandledrejection', (e) => this.handleUnhandledRejection(e));
    }

    handleGlobalError(e) {
        console.error('Global error:', e.message);
        this.showError(e.message, 'GLOBAL_ERROR');
    }

    handleUnhandledRejection(e) {
        console.error('Unhandled rejection:', e.reason);
    }

    async showSplash() {
        this.elements.splash.classList.add('visible');
        
        setTimeout(() => {
            this.elements.splash.classList.add('hidden');
            this.elements.app.classList.remove('hidden');
        }, 2000);
    }

    switchView(view) {
        this.currentView = view;
        
        this.elements.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
        });

        const targetView = document.getElementById(`${view}View`);
        if (targetView) targetView.classList.add('active');

        if (view === 'settings') {
            window.dispatchEvent(new CustomEvent('settingsViewOpen'));
        }
    }

    async registerSW() {
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                console.log('SW registered:', reg.scope);
            } catch (e) {
                console.warn('SW registration failed:', e);
            }
        }
    }

    async installPrompt() {
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            deferredPrompt.prompt();
            const outcome = await deferredPrompt.userChoice;
            if (outcome.outcome === 'accepted') {
                console.log('PWA installed');
            }
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showError(message, code = 'ERROR') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-content">
                <div class="error-message">${message}</div>
                <div class="error-code">${code}</div>
            </div>
            <button class="error-dismiss">×</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.classList.add('show'), 100);
        
        errorDiv.querySelector('.error-dismiss').onclick = () => {
            errorDiv.classList.remove('show');
            setTimeout(() => errorDiv.remove(), 300);
        };
        
        setTimeout(() => {
            errorDiv.classList.remove('show');
            setTimeout(() => errorDiv.remove(), 300);
        }, 8000);
    }

    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

const app = new AetherApp();
document.addEventListener('DOMContentLoaded', () => app.init());

window.showError = (msg, code) => app.showError(msg, code);
window.showToast = (msg) => app.showToast(msg);

export default app;