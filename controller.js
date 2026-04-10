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
      effortModeBtn: document.getElementById('effortModeBtn'),
      effortSelect: document.getElementById('effortSelect'),
      effortLabel: document.getElementById('effortLabel'),

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
    // Effort Mode Toggle
    if (this.elements.effortModeBtn && this.elements.effortSelect) {
      this.elements.effortModeBtn.addEventListener('click', () => {
        this.elements.effortSelect.style.display = 'inline-block';
        this.elements.effortSelect.focus();
      });
      
      this.elements.effortSelect.addEventListener('change', (e) => {
        const effort = e.target.value;
        this.elements.effortLabel.textContent = e.target.options[e.target.selectedIndex].text;
        this.elements.effortSelect.style.display = 'none';
        toast.info(`Effort mode: ${effort}`);
      });
      
      this.elements.effortSelect.addEventListener('blur', () => {
        this.elements.effortSelect.style.display = 'none';
      });
    }

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
      this.elements.devToolsBtn.addEventListener('click', async () => {
        toast.info('Initializing DevTools...');
        modal.open('Developer Tools', `
          <div class="devtools-container">
            <div class="tool-section">
              <h4>MCP Tool Registry</h4>
              <div id="mcp-tool-list" class="tool-list-container">Loading available tools...</div>
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

        // Fetch and render tools
        setTimeout(async () => {
          const toolList = document.getElementById('mcp-tool-list');
          try {
            const tools = await aiService.getAvailableTools();
            if (tools && tools.length > 0) {
              toolList.innerHTML = tools.map(t => `
                <div class="tool-item">
                  <strong>${t.name}</strong>: ${t.description}
                </div>
              `).join('');
            } else {
              toolList.innerHTML = 'No MCP tools registered on server.';
            }
          } catch (e) {
            toolList.innerHTML = 'Failed to load tools from backend.';
          }
        }, 100);

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

    // Templates Modal
    if (document.getElementById('templatesBtn')) {
      document.getElementById('templatesBtn').addEventListener('click', () => {
        this.openTemplatesModal();
      });
    }

    if (document.getElementById('closeTemplates')) {
      document.getElementById('closeTemplates').addEventListener('click', () => {
        modal.close();
      });
    }

    document.querySelectorAll('[data-template-tab]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('[data-template-tab]').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.filterTemplates(e.target.dataset.templateTab);
      });
    });
  }

  openTemplatesModal() {
    const allTemplates = templates.getAll();
    const categories = ['all', 'code', 'writing', 'creative', 'ghana', 'startup', 'analysis', 'research'];
    
    // Update category tabs
    const tabsContainer = document.querySelector('#templatesModal .modal-body > div');
    if (tabsContainer) {
      tabsContainer.innerHTML = categories.map(cat => 
        `<button class="sidebar-tab ${cat === 'all' ? 'active' : ''}" data-template-tab="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>`
      ).join('');
    }

    // Render all templates
    this.renderTemplates(allTemplates);

    modal.open('Prompt Templates', `
      <div style="margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
        ${categories.map(cat => 
          `<button class="sidebar-tab ${cat === 'all' ? 'active' : ''}" data-template-tab="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>`
        ).join('')}
      </div>
      <div class="templates-grid" id="templatesGrid">
        ${this.renderTemplateCards(allTemplates)}
      </div>
    `, { width: 900 });
  }

  renderTemplateCards(templateList) {
    return templateList.map(t => `
      <div class="template-card" data-template-id="${t.id}">
        <span class="icon icon-lg"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
        <h4>${t.name}</h4>
        <p>${t.prompt.substring(0, 80)}...</p>
      </div>
    `).join('');
  }

  filterTemplates(category) {
    const allTemplates = templates.getAll();
    const filtered = category === 'all' ? allTemplates : allTemplates.filter(t => t.category === category);
    const grid = document.getElementById('templatesGrid');
    if (grid) {
      grid.innerHTML = this.renderTemplateCards(filtered);
      this.bindTemplateCards();
    }
  }

  bindTemplateCards() {
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const templateId = card.dataset.templateId;
        const template = templates.get(templateId);
        if (template) {
          modal.close();
          this.useTemplate(template);
        }
      });
    });
  }

  useTemplate(template) {
    const { prompt, missing } = templates.render(template);
    
    if (missing.length === 0) {
      this.elements.messageInput.value = prompt;
      this.elements.messageInput.focus();
    } else {
      // Show variable input modal
      modal.open('Fill Template Variables', `
        <div class="template-variables">
          ${missing.map(varName => `
            <div class="form-group">
              <label>${varName}</label>
              <input type="text" id="var-${varName}" placeholder="Enter ${varName}...">
            </div>
          `).join('')}
          <button id="use-template-btn" class="primary-btn">Use Template</button>
        </div>
      `);

      setTimeout(() => {
        document.getElementById('use-template-btn')?.addEventListener('click', () => {
          const variables = {};
          missing.forEach(v => {
            const input = document.getElementById(`var-${v}`);
            if (input) variables[v] = input.value;
          });
          const { prompt: finalPrompt } = templates.render(template, variables);
          modal.close();
          this.elements.messageInput.value = finalPrompt;
          this.elements.messageInput.focus();
        });
      }, 100);
    }
  }

  setupInitialState() {
    const apiUrl = import.meta.env?.VITE_API_URL;
    if (apiUrl) {
      this.baseUrl = apiUrl;
    } else if (window.location.hostname.includes('vercel')) {
      this.baseUrl = 'https://aether-pwa.onrender.com/api';
    }
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
      const model = this.elements.modelSelector?.value || 'deepseek/deepseek-chat';

      // Get current conversation or create one
      let conv = conversations.getCurrent();
      if (!conv) {
        conv = conversations.create({ title: text });
      }

      conversations.addMessage(conv.id, { role: 'user', content: text });

      // Check if this is a Ghana-related query
      const ghanaKeywords = ['ghana', 'ghanaian', 'accra', 'mest', 'lagos', 'afcfta', 'momo', 'mobile money', 'diaspora', 'export', 'invest', 'tender', 'grant', 'startup', 'africa'];
      const isGhanaQuery = ghanaKeywords.some(kw => text.toLowerCase().includes(kw));
      
      // Get AI Response with Ghana focus if applicable
      const effort = this.elements.effortSelect?.value || 'deep';
      const chatOptions = { model, effort, stream: effort === 'autonomous' };
      if (isGhanaQuery && aiService.getGhanaGlobalSystemPrompt) {
        const ghanaMessages = [
          { role: 'system', content: aiService.getGhanaGlobalSystemPrompt() },
          ...conversations.get(conv.id).messages
        ];
        const response = await aiService.proxyChat(ghanaMessages, chatOptions);
      } else {
        const response = await aiService.chat(
          conversations.get(conv.id).messages,
          chatOptions
        );
      }

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
