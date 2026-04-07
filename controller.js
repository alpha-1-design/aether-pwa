/**
 * Aether PWA - Main Application Controller
 * Connects the UI to the core services.
 */

import { aiService, conversations, memory, templates, artifacts, codeExecutor } from './app.js';
import { toast, modal, theme, notifications, network } from './app.js';
import { Scene3D } from './scene3d.js';

class AppController {
  constructor() {
    this.elements = {};
    this.scene3D = null;
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
      messagesContainer: document.getElementById('messagesContainer'),
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

      // 3D Mode Elements
      mode3DContainer: document.getElementById('mode3d'),
      mode3DCanvas: document.getElementById('mode3d-canvas'),
      mode3DInput: document.getElementById('mode3d-input'),
      mode3DSend: document.getElementById('mode3d-send'),
      mode3DClose: document.getElementById('mode3d-close'),
      mode3DTabs: document.querySelectorAll('.mode-3d-tab'),
      mode3DContents: document.querySelectorAll('.mode-3d-content'),

      // Other
      notificationBell: document.getElementById('notificationBell'),
      notificationCenter: document.getElementById('notificationCenter'),
      clearAllNotifications: document.getElementById('clearAllNotifications'),
      closeBatchPanel: document.getElementById('closeBatchPanel'),
      addKnowledgeBtn: document.getElementById('addKnowledgeBtn'),
      importKnowledgeBtn: document.getElementById('importKnowledgeBtn'),
      uploadWorkspaceBtn: document.getElementById('uploadWorkspaceBtn'),
      inviteTeamBtn: document.getElementById('inviteTeamBtn'),
      exportCsvBtn: document.getElementById('exportCsvBtn'),
      exportJsonBtn: document.getElementById('exportJsonBtn'),
      exportPdfBtn: document.getElementById('exportPdfBtn'),
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
        toast.info('Opening Education Center...');
        modal.open('Education Center', `
          <div class="education-center">
            <h3>Learning Modules</h3>
            <div class="module-grid">
              <div class="module-card">
                <h4>Quantum Computing</h4>
                <p>Explore the basics of qubits and superposition.</p>
                <button class="primary-btn" onclick="app.startModule('quantum')">Start Learning</button>
              </div>
              <div class="module-card">
                <h4>Advanced AI Architectures</h4>
                <p>Dive deep into Transformer models and Attention mechanisms.</p>
                <button class="primary-btn" onclick="app.startModule('ai-arch')">Start Learning</button>
              </div>
              <div class="module-card">
                <h4>MCP Integration</h4>
                <p>Master the Model Context Protocol for tool use.</p>
                <button class="primary-btn" onclick="app.startModule('mcp')">Start Learning</button>
              </div>
            </div>
          </div>
        `);
      });
    }

    if (this.elements.devToolsBtn) {
      this.elements.devToolsBtn.addEventListener('click', () => {
        toast.info('Initializing DevTools...');
        modal.open('Developer Tools', `
          <div class="devtools-container">
            <div class="tool-section">
              <h4>MCP Tool Registry</h4>
              <div id="mcp-tool-list">Loading available tools...</div>
            </div>
            <div class="tool-section">
              <h4>Sandbox Execution</h4>
              <div class="sandbox-ctrl">
                <input type="text" id="sandbox-cmd" placeholder="Enter python code...">
                <button id="run-sandbox-btn" class="primary-btn">Run</button>
              </div>
              <pre id="sandbox-output" class="output-box">Output will appear here...</pre>
            </div>
          </div>
        `, {
          width: 800
        });

        // Bind sandbox button after modal opens
        setTimeout(() => {
          document.getElementById('run-sandbox-btn')?.addEventListener('click', async () => {
            const code = document.getElementById('sandbox-cmd')?.value;
            if (!code) return;
            const out = document.getElementById('sandbox-output');
            out.textContent = 'Executing...';
            try {
              const result = await aiService.executeCode(code, 'python');
              out.textContent = result.success ? result.output : result.error;
            } catch (e) {
              out.textContent = `Error: ${e.message}`;
            }
          });
        }, 100);
      });
    }

    if (this.elements.themeBtn) {
      this.elements.themeBtn.addEventListener('click', () => {
        const next = theme.toggle();
        toast.info(`Theme changed to ${next}`);
      });
    }

    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
    }

    // Insert buttons logic
    if (this.elements.insert3DBtn) {
      this.elements.insert3DBtn.addEventListener('click', () => {
        toast.info('Entering 3D Synthesis Mode...');
        this.enterMode3D();
      });
    }

    if (this.elements.insertDiagramBtn) {
      this.elements.insertDiagramBtn.addEventListener('click', () => {
        toast.info('Diagram Mode Activated');
        modal.open('Diagram Architect', `
          <div class="diagram-builder">
            <textarea id="diagram-desc" placeholder="Describe the flow or structure..."></textarea>
            <button id="gen-diagram-btn" class="primary-btn">Generate Mermaid Chart</button>
            <div id="diagram-preview" class="preview-box"></div>
          </div>
        `, { width: 600 });

        setTimeout(() => {
          document.getElementById('gen-diagram-btn')?.addEventListener('click', async () => {
            const desc = document.getElementById('diagram-desc')?.value;
            const preview = document.getElementById('diagram-preview');
            preview.innerHTML = 'Generating...';
            try {
              const res = await aiService.chat([{role: 'system', content: 'Generate only a Mermaid JS diagram syntax.'}, {role: 'user', content: desc}]);
              preview.innerHTML = `<pre class="mermaid">${res.content}</pre>`;
              mermaid.init();
            } catch (e) {
              preview.innerHTML = `Error: ${e.message}`;
            }
          });
        }, 100);
      });
    }

    if (this.elements.insertChartBtn) {
      this.elements.insertChartBtn.addEventListener('click', () => {
        toast.info('Data Visualization Mode');
        modal.open('Chart Architect', `
          <div class="chart-builder">
            <textarea id="chart-data" placeholder="Paste CSV or describe data..."></textarea>
            <button id="gen-chart-btn" class="primary-btn">Synthesize Visualization</button>
            <div id="chart-preview" class="preview-box"></div>
          </div>
        `, { width: 600 });

        setTimeout(() => {
          document.getElementById('gen-chart-btn')?.addEventListener('click', async () => {
            const data = document.getElementById('chart-data')?.value;
            const preview = document.getElementById('chart-preview');
            preview.innerHTML = 'Processing data...';
            try {
              const res = await aiService.chat([{role: 'system', content: 'Analyze data and suggest best chart type with values.'}, {role: 'user', content: data}]);
              preview.innerHTML = `<div>${res.content}</div>`;
            } catch (e) {
              preview.innerHTML = `Error: ${e.message}`;
            }
          });
        }, 100);
      });
    }

    if (this.elements.mode3DSend) {
      this.elements.mode3DSend.addEventListener('click', () => this.handleMode3DMessage());
    }

    if (this.elements.mode3DInput) {
      this.elements.mode3DInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleMode3DMessage();
      });
    }

    this.elements.mode3DTabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchMode3DTab(tab.dataset.tab));
    });
  }

  async handleMode3DMessage() {
    const text = this.elements.mode3DInput.value.trim();
    if (!text) return;

    this.elements.mode3DInput.value = '';

    try {
      // Lazy init 3D Scene
      if (!this.scene3D) {
        this.scene3D = new Scene3D('mode3d-canvas');
      }

      const response = await aiService.chat([
        { role: 'system', content: 'You are a 3D Scene Architect. Respond ONLY with a raw JSON string representing the object: { "type": "cube|sphere|torus|pyramid|cylinder|ring|icosahedron", "position": [x,y,z], "color": "hex" }' },
        { role: 'user', content: text }
      ]);

      this.appendMode3DMessage('user', text);

      // Attempt to synthesize the object in 3D space
      await this.scene3D.synthesizeObject(response.content);

      this.appendMode3DMessage('assistant', `Object synthesized: ${response.content}`);
      toast.success('Object materialized in 3D space');
    } catch (e) {
      console.error('3D synthesis error:', e);
      this.appendMode3DMessage('assistant', `Error: ${e.message}`);
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

  enterMode3D() {
    if (this.elements.mode3DContainer) {
      this.elements.mode3DContainer.style.display = 'block';
      toast.info('3D Space Initialized');
    }
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

    // Initial theme apply
    theme.apply(theme.getTheme());
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
