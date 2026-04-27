// Aether PWA - Main App Initialization
import { initializeSettingsUI } from './settings.js';
import { initializeChatUI } from './chat.js';

function initializeNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;

      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      views.forEach(view => {
        if (view.id === `${targetView}View`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    });
  });
}

// History & Session Management
function initializeHistory() {
  const historyBtn = document.getElementById('historyBtn');
  const historyModal = document.getElementById('historyModal');
  const sessionList = document.getElementById('sessionList');
  const newChatBtn = document.getElementById('newChatBtn');

  if (!historyBtn || !historyModal) return;

  historyBtn.addEventListener('click', () => {
    renderSessions();
    historyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  // Close modal logic is handled by the global modalCloseBtns in initializeAgents
  // But we need to ensure it works for the historyModal too
  const closeBtns = historyModal.querySelectorAll('.modal-close');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      historyModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      const newId = window.sessionManager.createSession();
      renderSessions();
      loadMessagesFromSession(newId);
      historyModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  function renderSessions() {
    if (!sessionList) return;
    const sessions = window.sessionManager.sessions;
    const currentId = window.sessionManager.currentSessionId;

    sessionList.innerHTML = Object.values(sessions).sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    ).map(session => `
      <div class="session-item ${session.id === currentId ? 'active' : ''}" data-id="${session.id}">
        <div class="session-info">
          <span class="session-name">${session.name}</span>
          <span class="session-date">${new Date(session.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="session-actions">
          <button class="delete-session-btn" data-id="${session.id}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    sessionList.querySelectorAll('.session-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (window.sessionManager.switchSession(id)) {
          loadMessagesFromSession(id);
          historyModal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    sessionList.querySelectorAll('.delete-session-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Delete this chat session?')) {
          window.sessionManager.deleteSession(id);
          renderSessions();
          if (window.sessionManager.currentSessionId === id) {
             // Handle case where current session was deleted
             loadMessagesFromSession(window.sessionManager.currentSessionId);
          }
        }
      });
    });
  }

  function loadMessagesFromSession(sessionId) {
    const messages = window.sessionManager.getMessages();
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';
    messages.forEach(msg => {
      window.displayMessage(msg.role, msg.content, false);
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Aether initializing...');

  initializeApp();
  initializeNavigation();
  initializeInputHandlers();
  initializeSettingsSections();
  initializeTheme();
  initializeAgents();
  initializeVoiceInput();
  initializeFileUpload();
  initializeChatUI();
  initializeHistory();

  console.log('Aether ready');
});

function initializeApp() {
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    initializeDropZone();
  }
}

function initializeNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;
      
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      views.forEach(view => {
        if (view.id === `${targetView}View`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    });
  });
}

function initializeInputHandlers() {
  // Handled by chat.js
}

function initializeSettingsSections() {
  const sectionHeaders = document.querySelectorAll('.section-header');
  
  sectionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.settings-section');
      const content = section.querySelector('.section-content');
      const chevron = header.querySelector('.chevron');
      const isExpanded = !content.classList.contains('hidden');
      
      if (isExpanded) {
        content.classList.add('hidden');
        chevron.style.transform = '';
      } else {
        content.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
      }
    });
  });
}

function initializeTheme() {
  const themeBtns = document.querySelectorAll('.theme-btn');
  const soulColorPicker = document.getElementById('soulColorPicker');
  const soulColorHex = document.getElementById('soulColorHex');

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.body.className = '';
      if (theme !== 'space-dark') {
        document.body.classList.add(theme);
      }
      localStorage.setItem('aether-theme', theme);
    });
  });

  if (soulColorPicker) {
    soulColorPicker.addEventListener('input', (e) => {
      const color = e.target.value;
      updateSoulColor(color);
      if (soulColorHex) soulColorHEx.textContent = color.toUpperCase();
      localStorage.setItem('aether-soul-color', color);
    });
  }

  const savedTheme = localStorage.getItem('aether-theme');
  if (savedTheme) {
    document.body.className = '';
    if (savedTheme !== 'space-dark') {
      document.body.classList.add(savedTheme);
    }
    themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === savedTheme);
    });
  }

  const savedColor = localStorage.getItem('aether-soul-color');
  if (savedColor) {
    updateSoulColor(savedColor);
    if (soulColorPicker) soulColorPicker.value = savedColor;
    if (soulColorHex) soulColorHex.textContent = savedColor.toUpperCase();
  }
}

function updateSoulColor(color) {
  document.documentElement.style.setProperty('--color-primary', color);
  // Generate lighter/darker versions for hover/active
  // For a truly professional feel, we'd use a library like chroma.js,
  // but we can simulate it with simple CSS filter shifts or specific offsets
  document.documentElement.style.setProperty('--color-primary-hover', color);
  document.documentElement.style.setProperty('--color-primary-active', color);
}

function initializeAgents() {
  const createAgentBtn = document.getElementById('createAgentBtn');
  const emptyCreateAgentBtn = document.getElementById('emptyCreateAgentBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const saveAgentBtn = document.getElementById('saveAgentBtn');
  
  [createAgentBtn, emptyCreateAgentBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', openModal);
    }
  });
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }
  
  const modalCloseBtns = document.querySelectorAll('.modal-close, .modal-close-btn');
  modalCloseBtns.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  if (saveAgentBtn) {
    saveAgentBtn.addEventListener('click', saveAgent);
  }
}

function initializeVoiceInput() {
  const voiceBtn = document.getElementById('voiceBtn');
  if (!voiceBtn) return;
  
  let recognition = null;
  let isListening = false;
  
  voiceBtn.addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Speech recognition not supported', 'error');
      return;
    }
    
    if (isListening) {
      if (recognition) recognition.stop();
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      isListening = true;
      voiceBtn.classList.add('listening');
      showToast('Listening...', 'info');
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      const messageInput = document.getElementById('messageInput');
      if (messageInput) messageInput.value = transcript;
    };
    
    recognition.onend = () => {
      isListening = false;
      voiceBtn.classList.remove('listening');
    };
    
    recognition.onerror = (event) => {
      isListening = false;
      voiceBtn.classList.remove('listening');
      showToast('Voice error: ' + event.error, 'error');
    };
    
    recognition.start();
  });
}

function initializeFileUpload() {
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt,.md';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }
  
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const messageInput = document.getElementById('messageInput');
      if (messageInput) {
        if (messageInput.value.trim()) {
          messageInput.value += '\n\n--- ' + file.name + ' ---\n' + text;
        } else {
          messageInput.value = '--- ' + file.name + ' ---\n' + text;
        }
      }
      showToast('File attached: ' + file.name, 'success');
    } catch (err) {
      showToast('Failed to read file', 'error');
    }
    fileInput.value = '';
  });
}

function initializeDropZone() {
  const dropZone = document.getElementById('dropZone');
  if (!dropZone) return;
  const body = document.body;
  
  body.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.remove('hidden');
  });
  
  body.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget || !body.contains(e.relatedTarget)) {
      dropZone.classList.add('hidden');
    }
  });
  
  body.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.add('hidden');
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    const text = await file.text();
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      if (messageInput.value.trim()) {
        messageInput.value += '\n\n--- ' + file.name + ' ---\n' + text;
      } else {
        messageInput.value = '--- ' + file.name + ' ---\n' + text;
      }
      showToast('File dropped: ' + file.name, 'success');
    }
  });
}

async function saveAgent() {
  const nameInput = document.getElementById('agentNameInput');
  const promptInput = document.getElementById('agentPromptInput');
  const knowledgeInput = document.getElementById('agentKnowledgeInput');
  
  if (!nameInput || !promptInput) return;
  
  const name = nameInput.value.trim();
  const prompt = promptInput.value.trim();
  const knowledge = knowledgeInput?.value.trim() || '';
  
  if (!name || !prompt) {
    showToast('Name and prompt required', 'error');
    return;
  }
  
  try {
    const { createAgent } = await import('./store.js');
    await createAgent(name, prompt, knowledge);
    
    nameInput.value = '';
    promptInput.value = '';
    if (knowledgeInput) knowledgeInput.value = '';
    closeModal();
    showToast('Agent created!', 'success');
    
    loadAgentsList();
  } catch (err) {
    console.error('Failed to save agent:', err);
    showToast('Failed to save agent', 'error');
  }
}

async function loadAgentsList() {
  const agentsList = document.getElementById('agentsList');
  if (!agentsList) return;
  
  try {
    const { getAllAgents, deleteAgent } = await import('./store.js');
    const agents = await getAllAgents();
    
    if (agents.length === 0) {
      agentsList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <h3>No agents yet</h3>
          <p>Create a custom agent to chat with</p>
          <button class="primary-btn" id="emptyCreateAgentBtn">Create Agent</button>
        </div>
      `;
      document.getElementById('emptyCreateAgentBtn')?.addEventListener('click', openModal);
    } else {
      agentsList.innerHTML = agents.map(agent => `
        <div class="agent-card" data-id="${agent.id}">
          <div class="agent-avatar">${agent.name.charAt(0).toUpperCase()}</div>
          <div class="agent-info">
            <h3>${escapeHtml(agent.name)}</h3>
            <p>${escapeHtml(agent.prompt.substring(0, 60))}...</p>
          </div>
          <button class="delete-agent-btn" data-id="${agent.id}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      `).join('');
      
      agentsList.querySelectorAll('.delete-agent-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          if (confirm('Delete this agent?')) {
            await deleteAgent(id);
            showToast('Agent deleted', 'success');
            loadAgentsList();
          }
        });
      });
    }
  } catch (err) {
    console.error('Failed to load agents:', err);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

window.showToast = showToast;

initializeSettingsUI();

window.addEventListener('load', () => {
  loadAgentsList();
});

window.openModal = openModal;
window.closeModal = closeModal;
window.loadAgentsList = loadAgentsList;