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

    // Header 3-dot menu opens Settings
    document.getElementById('headerMenu')?.addEventListener('click', () => {
      this.switchView('settings');
    });

    // Create Agent buttons
    document.getElementById('createAgentBtn')?.addEventListener('click', () => {
      this.openModal();
    });
    document.getElementById('emptyCreateAgentBtn')?.addEventListener('click', () => {
      this.openModal();
    });

    // Save Agent button in modal
    document.getElementById('saveAgentBtn')?.addEventListener('click', () => {
      this.saveAgent();
    });

    // History button
    document.getElementById('historyBtn')?.addEventListener('click', () => {
      this.openHistoryModal();
    });

    // Attach file button
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.md,.pdf,.png,.jpg,.jpeg';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    document.getElementById('attachBtn')?.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const input = document.getElementById('messageInput');
      if (input) {
        input.value = `--- ${file.name} ---\n${text}`;
        input.dispatchEvent(new Event('input'));
        this.showToast(`File attached: ${file.name}`, 'success');
      }
      fileInput.value = '';
    });

    // Voice input button
    this.initVoiceInput();

    // Search button
    document.getElementById('searchBtn')?.addEventListener('click', () => {
      const input = document.getElementById('messageInput');
      if (input) {
        input.value = '/search ';
        input.focus();
        this.showToast('Type your search query after /search', 'info');
      }
    });

    // New Chat button
    document.getElementById('newChatBtn')?.addEventListener('click', () => {
      this.startNewChat();
    });

    // Clear History button
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
      if (confirm('Clear all chat history? This cannot be undone.')) {
        localStorage.removeItem('aether_current_messages');
        const container = document.getElementById('messages');
        if (container) container.innerHTML = `
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 200 200" width="80" height="80">
              <!-- SVG placeholder -->
            </svg>
            <h2>Start a conversation</h2>
            <p>Type a message to begin</p>
          </div>`;
        this.showToast('History cleared', 'success');
      }
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
    // Load saved agents
    this.loadAgents();

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

    this.renderSavedKeys();
    this.initModelSelect();
    this.initCrossDevice();
  }

  initModelSelect() {
    const select = document.getElementById('defaultModelSelect');
    if (!select) return;

    const provider = localStorage.getItem('aether_default_provider') || 'openrouter';
    const savedModel = localStorage.getItem('aether_default_model');

    const freeModels = {
      openrouter: ['google/gemma-3-27b-it', 'qwen/qwen3-30b-a3b', 'deepseek/deepseek-chat'],
      groq: ['llama-3.3-70b-specdec', 'mixtral-8x7b-32768'],
      cerebras: ['llama-3.3-70b'],
      google: ['gemini-2.0-flash-exp'],
      opencode: ['big-pickle', 'MiniMax-M2.5-Free', 'GLM-4.7-Free'],
      openai: ['gpt-4o-mini'],
      anthropic: ['claude-3-haiku-20240307']
    };

    const models = freeModels[provider] || freeModels['openrouter'];
    select.innerHTML = models.map(m =>
      `<option value="${m}" ${m === savedModel ? 'selected' : ''}>${m}</option>`
    ).join('');

    select.addEventListener('change', () => {
      localStorage.setItem('aether_default_model', select.value);
    });

    document.getElementById('apiProviderSelect')?.addEventListener('change', (e) => {
      localStorage.setItem('aether_default_provider', e.target.value);
      this.initModelSelect();
    });
  }

  initCrossDevice() {
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;

        document.getElementById('hostInfo')?.classList.toggle('hidden', mode !== 'host');
        document.getElementById('joinInfo')?.classList.toggle('hidden', mode !== 'join');
        document.getElementById('connectedDevices')?.classList.add('hidden');
        document.getElementById('shareOptions')?.classList.add('hidden');
      });
    });

    document.getElementById('showQrBtn')?.addEventListener('click', () => {
      const qrContainer = document.getElementById('qrContainer');
      if (qrContainer) {
        qrContainer.classList.toggle('hidden');
        this.showToast('QR code generation coming soon', 'info');
      }
    });

    document.getElementById('joinDeviceBtn')?.addEventListener('click', () => {
      const hostIp = document.getElementById('hostIpInput')?.value;
      if (hostIp) {
        this.showToast(`Connecting to ${hostIp}...`, 'info');
      } else {
        this.showToast('Enter host IP address', 'error');
      }
    });
  }

  loadTheme() {
    const savedColor = localStorage.getItem('aether-soul-color');
    if (savedColor) {
      document.documentElement.style.setProperty('--color-primary', savedColor);
      const picker = document.getElementById('soulColorPicker');
      const hex = document.getElementById('soulColorHex');
      if (picker) picker.value = savedColor;
      if (hex) hex.textContent = savedColor.toUpperCase();

      picker?.addEventListener('input', (e) => {
        const color = e.target.value;
        document.documentElement.style.setProperty('--color-primary', color);
        if (hex) hex.textContent = color.toUpperCase();
        localStorage.setItem('aether-soul-color', color);
      });
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

  initVoiceInput() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      voiceBtn.style.display = 'none';
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    voiceBtn.addEventListener('click', () => {
      if (isListening) {
        if (recognition) recognition.stop();
        return;
      }

      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        this.showToast('Listening...', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join('');
        const input = document.getElementById('messageInput');
        if (input) input.value = transcript;
      };

      recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
      };

      recognition.onerror = (event) => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        this.showToast('Voice error: ' + event.error, 'error');
      };

      recognition.start();
    });
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

  saveAgent() {
    const name = document.getElementById('agentNameInput')?.value;
    const prompt = document.getElementById('agentPromptInput')?.value;
    const knowledge = document.getElementById('agentKnowledgeInput')?.value;

    if (!name || !prompt) {
      this.showToast('Name and system prompt are required', 'error');
      return;
    }

    const agents = JSON.parse(localStorage.getItem('aether_agents') || '[]');
    agents.push({ name, prompt, knowledge, id: Date.now().toString() });
    localStorage.setItem('aether_agents', JSON.stringify(agents));

    this.loadAgents();
    this.closeModal();
    this.showToast(`Agent "${name}" created`, 'success');
  }

  loadAgents() {
    const container = document.getElementById('agentsList');
    if (!container) return;

    const agents = JSON.parse(localStorage.getItem('aether_agents') || '[]');

    if (agents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <h3>No agents yet</h3>
          <p>Create a custom agent to chat with</p>
          <button class="primary-btn" id="emptyCreateAgentBtn">Create Agent</button>
        </div>`;
      document.getElementById('emptyCreateAgentBtn')?.addEventListener('click', () => {
        this.openModal();
      });
      return;
    }

    container.innerHTML = agents.map(agent => `
      <div class="agent-item" data-id="${agent.id}">
        <div class="agent-info">
          <h4>${agent.name}</h4>
          <p>${agent.prompt.substring(0, 100)}...</p>
        </div>
        <div class="agent-actions">
          <button class="icon-btn" onclick="window.aetherApp.deleteAgent('${agent.id}')" title="Delete">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>`).join('');
  }

  deleteAgent(id) {
    const agents = JSON.parse(localStorage.getItem('aether_agents') || '[]');
    const filtered = agents.filter(a => a.id !== id);
    localStorage.setItem('aether_agents', JSON.stringify(filtered));
    this.loadAgents();
    this.showToast('Agent deleted', 'success');
  }

  openHistoryModal() {
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
      historyModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  startNewChat() {
    localStorage.removeItem('aether_current_messages');
    const container = document.getElementById('messages');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 200 200" width="80" height="80">
            <!-- SVG placeholder -->
          </svg>
          <h2>Start a conversation</h2>
          <p>Type a message to begin</p>
        </div>`;
    }
    document.getElementById('historyModal')?.classList.remove('active');
    document.body.style.overflow = '';
    this.showToast('New chat started', 'success');
  }
}

window.aetherApp = new AetherApp();
