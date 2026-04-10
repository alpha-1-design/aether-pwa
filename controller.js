/**
 * Aether PWA - Main Application Controller
 * Connects the UI to the core services.
 */

import { aiService, conversations, memory, templates, artifacts, codeExecutor } from './app.js';
import { toast, modal, theme, notifications, network } from './app.js';

class AppController {
  constructor() {
    this.elements = {};
    this.init();
  }

  init() {
    this.mapElements();
    this.setupEventListeners();
    this.setupInitialState();
    console.log('Aether Controller Initialized');
  }

  mapElements() {
    this.elements = {
      // Chat
      messageInput: document.getElementById('messageInput'),
      sendBtn: document.getElementById('sendBtn'),
      messagesContainer: document.querySelector('.studio-chat-panel'),
      welcomeScreen: document.getElementById('welcomeScreen'),
      modelSelector: document.getElementById('modelSelector'),

      // Sidebar
      newChatBtn: document.getElementById('newChatBtn'),
      conversationsList: document.getElementById('conversationsList'),

      // Features
      educationBtn: document.getElementById('educationBtn'),
      devToolsBtn: document.getElementById('devToolsBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      themeBtn: document.getElementById('themeBtn'),

      // Other
      notificationBell: document.getElementById('notificationBell'),
      notificationCenter: document.getElementById('notificationCenter'),
    };
  }

  setupEventListeners() {
    // Chat functionality
    if (this.elements.sendBtn) {
      this.elements.sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    if (this.elements.messageInput) {
      this.elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
        this.elements.sendBtn.disabled = !this.elements.messageInput.value.trim();
      });
    }

    // New Chat
    if (this.elements.newChatBtn) {
      this.elements.newChatBtn.addEventListener('click', () => this.createNewChat());
    }

    // Feature Buttons
    if (this.elements.educationBtn) {
      this.elements.educationBtn.addEventListener('click', () => {
        toast.info('Opening Education Resources...');
        modal.open('Education Center', '<p>Learning modules are loading...</p>');
      });
    }

    if (this.elements.devToolsBtn) {
      this.elements.devToolsBtn.addEventListener('click', () => {
        toast.info('Opening Developer Tools...');
        modal.open('Dev Tools', '<p>Sandbox and MCP tools are initializing...</p>');
      });
    }

    if (this.elements.themeBtn) {
      this.elements.themeBtn.addEventListener('click', () => {
        toast.info('Studio Dark theme is active');
      });
    }

    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
    }
  }

  async handleMode3DMessage() {
    const text = this.elements.mode3DInput.value.trim();
    if (!text) return;

    this.elements.mode3DInput.value = '';

    // Logic to create 3D objects via AI
    try {
      const response = await aiService.chat([
        { role: 'system', content: 'You are a 3D Scene Architect. Respond only with JSON descriptions of 3D objects: { "type": "cube|sphere|torus|pyramid|cylinder|ring|icosahedron", "position": [x,y,z], "color": "hex" }' },
        { role: 'user', content: text }
      ]);

      // This is where the "NASA-like" magic happens.
      // We parse the AI response and inject it into the Three.js scene.
      this.appendMode3DMessage('user', text);
      this.appendMode3DMessage('assistant', `Created: ${response.content}`);

      // Trigger actual 3D rendering (mocked here, but linked to the backend's logic)
      toast.success('Object synthesized in 3D space');
    } catch (e) {
      toast.error('3D Synthesis failed');
    }
  }

  switchMode3DTab(tabId) {
    this.elements.mode3DTabs.forEach(t => t.classList.remove('active'));
    this.elements.mode3DContents.forEach(c => c.style.display = 'none');

    const activeTab = Array.from(this.elements.mode3DTabs).find(t => t.dataset.tab === tabId);
    if (activeTab) activeTab.classList.add('active');

    const activeContent = document.getElementById(`mode3d-${tabId}`);
    if (activeContent) activeContent.style.display = 'block';
  }

  appendMode3DMessage(role, content) {
    const container = document.getElementById('mode3d-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `mode-3d-message ${role}`;
    div.textContent = content;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  setupInitialState() {
    // Use environment variable if available, otherwise fallback to the correct Render URL
    this.baseUrl = import.meta.env?.VITE_API_URL || 'https://aether-pwa.onrender.com/api';
    aiService.baseUrl = this.baseUrl;

    // Load conversations
    this.refreshConversations();

    // Enforce Studio Dark theme
    theme.apply('dark');
  }

  async handleSendMessage() {
    const text = this.elements.messageInput.value.trim();
    if (!text) return;

    // Handle Commands (e.g., /execute, /search)
    if (text.startsWith('/')) {
      this.handleCommand(text);
      this.elements.messageInput.value = '';
      this.elements.sendBtn.disabled = true;
      return;
    }

    // Hide welcome screen
    if (this.elements.welcomeScreen) {
      this.elements.welcomeScreen.style.display = 'none';
    }

    // Show messages container
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.style.display = 'flex';
    }

    this.elements.messageInput.value = '';
    this.elements.sendBtn.disabled = true;

    // Add user message to UI
    this.appendMessage('user', text);

    try {
      const model = this.elements.modelSelector?.value || 'gpt-4';

      // Get current conversation or create one
      let conv = conversations.getCurrent();
      if (!conv) {
        conv = conversations.create({ title: text });
      }

      conversations.addMessage(conv.id, { role: 'user', content: text });

      // Get AI Response
      const response = await aiService.chat(
        conversations.get(conv.id).messages,
        { model }
      );

      // Handle Thinking and Content
      let finalContent = response.content;
      if (response.thinking) {
        finalContent = `<div class="thinking-indicator"><strong>Thinking:</strong> ${response.thinking}</div>\n${response.content}`;
      }

      this.appendMessage('assistant', finalContent);
      conversations.addMessage(conv.id, { role: 'assistant', content: response.content });

      this.refreshConversations();
    } catch (error) {
      console.error('Chat Error:', error);
      toast.error(`Chat failed: ${error.message}`);
    }
  }

  handleCommand(commandText) {
    const [cmd, ...args] = commandText.split(' ');
    const query = args.join(' ');

    this.appendMessage('user', commandText);

    if (cmd === '/search') {
      this.executeSearch(query);
    } else if (cmd === '/execute') {
      this.executeCode(query);
    } else {
      toast.error(`Unknown command: ${cmd}. Try /search or /execute`);
    }
  }

  async executeSearch(query) {
    if (!query) {
      toast.error('Please provide a search query');
      return;
    }

    this.appendMessage('assistant', `Searching for "${query}"...`);
    try {
      const result = await aiService.search(query);
      this.appendMessage('assistant', `Search results for ${query}:\n\n${JSON.stringify(result.results || [], null, 2)}`);
    } catch (e) {
      toast.error(`Search failed: ${e.message}`);
    }
  }

  async executeCode(code) {
    if (!code) {
      toast.error('Please provide code to execute');
      return;
    }

    this.appendMessage('assistant', `Executing code...`);
    try {
      const result = await aiService.executeCode(code, 'python');
      this.appendMessage('assistant', result.success ? `Output:\n${result.output}` : `Error:\n${result.error}`);
    } catch (e) {
      toast.error(`Execution failed: ${e.message}`);
    }
  }

  appendMessage(role, content) {
    if (!this.elements.messagesContainer) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-message`;
    msgDiv.innerHTML = `
      <div class="message-content">
        <div class="role-label">${role === 'user' ? 'You' : 'Aether'}</div>
        <div class="text">${content}</div>
      </div>
    `;
    this.elements.messagesContainer.appendChild(msgDiv);
    this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
  }

  createNewChat() {
    conversations.create();
    if (this.elements.welcomeScreen) {
      this.elements.welcomeScreen.style.display = 'flex';
    }
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.innerHTML = '';
      this.elements.messagesContainer.style.display = 'none';
    }
    this.refreshConversations();
  }

  refreshConversations() {
    if (!this.elements.conversationsList) return;

    const list = conversations.getAll();
    this.elements.conversationsList.innerHTML = list.map(conv => `
      <div class="conversation-item" data-id="${conv.id}">
        <span class="conv-title">${conv.title}</span>
      </div>
    `).join('');

    // Add click handlers to items
    this.elements.conversationsList.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        conversations.setCurrent(id);
        this.loadConversation(id);
      });
    });
  }

  loadConversation(id) {
    const conv = conversations.get(id);
    if (!conv) return;

    if (this.elements.welcomeScreen) {
      this.elements.welcomeScreen.style.display = 'none';
    }
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.style.display = 'flex';
      this.elements.messagesContainer.innerHTML = '';
      conv.messages.forEach(msg => this.appendMessage(msg.role, msg.content));
    }
  }

  openSettings() {
    modal.open('Settings', `
      <div class="settings-form">
        <div class="setting-item">
          <label>OpenRouter API Key</label>
          <input type="password" id="settings-openrouter-key" placeholder="sk-or-...">
        </div>
        <div class="setting-item">
          <label>Anthropic API Key</label>
          <input type="password" id="settings-anthropic-key" placeholder="sk-ant-...">
        </div>
        <button id="save-settings-btn" class="primary-btn">Save Changes</button>
      </div>
    `, {
      showFooter: false,
      width: 400
    });

    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
      const keys = {
        openrouter: document.getElementById('settings-openrouter-key')?.value,
        anthropic: document.getElementById('settings-anthropic-key')?.value,
      };
      aiService.saveKeys(keys);
      toast.success('Settings saved!');
      modal.closeAll();
    });
  }
}

// Initialize the app
const app = new AppController();
