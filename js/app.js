import { marked } from 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';

class AetherApp {
  constructor() {
    this.currentView = 'chat';
    this.messages = [];
    this.apiKeys = JSON.parse(localStorage.getItem('aether_api_keys') || '{}');
    this.init();
  }

  init() {
    this.bindNavButtons();
    this.bindMenuButton();
    this.bindSendButton();
    this.bindMessageInput();
    this.loadSettings();
  }

  bindNavButtons() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });
  }

  switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${view}View`)?.classList.add('active');
    document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
    this.currentView = view;
  }

  bindMenuButton() {
    document.getElementById('headerMenu')?.addEventListener('click', () => {
      this.switchView('settings');
    });
  }

  bindSendButton() {
    document.getElementById('sendBtn')?.addEventListener('click', () => this.sendMessage());
  }

  bindMessageInput() {
    const input = document.getElementById('messageInput');
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    input?.addEventListener('input', () => {
      document.getElementById('sendBtn').disabled = !input.value.trim();
    });
  }

  async sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    this.addMessage('user', text);
    input.value = '';
    document.getElementById('sendBtn').disabled = true;

    const typing = document.getElementById('typingIndicator');
    typing.classList.remove('hidden');

    try {
      const provider = localStorage.getItem('aether_default_provider') || 'openrouter';
      const model = localStorage.getItem('aether_default_model') || 'google/gemma-3-27b-it';
      const apiKey = this.apiKeys[provider];

      if (!apiKey) {
        this.addMessage('assistant', 'Please configure an API key in Settings.');
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          messages: [...this.messages, { role: 'user', content: text }],
          stream: false
        })
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || 'No response';
      this.addMessage('assistant', content);
    } catch (err) {
      this.addMessage('assistant', `Error: ${err.message}`);
    } finally {
      typing.classList.add('hidden');
    }
  }

  addMessage(role, content) {
    this.messages.push({ role, content });
    const container = document.getElementById('messages');
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `<div class="message-content">${marked.parse(content)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  loadSettings() {
    document.getElementById('saveApiKeyBtn')?.addEventListener('click', () => {
      const provider = document.getElementById('apiProviderSelect').value;
      const key = document.getElementById('apiKeyInput').value;
      if (provider && key) {
        this.apiKeys[provider] = key;
        localStorage.setItem('aether_api_keys', JSON.stringify(this.apiKeys));
        document.getElementById('apiKeyInput').value = '';
        this.renderSavedKeys();
      }
    });
  }

  renderSavedKeys() {
    const container = document.getElementById('savedKeys');
    if (!container) return;
    container.innerHTML = Object.keys(this.apiKeys).map(p =>
      `<div class="saved-key">${p} <button onclick="window.aetherApp.deleteKey('${p}')">Remove</button></div>`
    ).join('');
  }

  deleteKey(provider) {
    delete this.apiKeys[provider];
    localStorage.setItem('aether_api_keys', JSON.stringify(this.apiKeys));
    this.renderSavedKeys();
  }
}

window.aetherApp = new AetherApp();
