// Aether PWA - Main App Initialization
import { initializeSettingsUI } from './settings.js';
import { initializeChatUI } from './chat.js';
import { initializeAgentsUI } from './agents.js';

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
  initializeMissingHandlers();
  initializeVoiceInput();
  initializeFileUpload();
  initializeSettingsUI();
  initializeAgentsUI();
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
      if (soulColorHex) soulColorHex.textContent = color.toUpperCase();
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
  document.documentElement.style.setProperty('--color-primary-hover', color);
  document.documentElement.style.setProperty('--color-primary-active', color);
}

function initializeMissingHandlers() {
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
      const input = document.getElementById('messageInput');
      if (input) {
        const query = prompt('Enter search query:');
        if (query) {
          input.value = `/search ${query}`;
          input.dispatchEvent(new Event('input'));
        }
      }
    });
  }

  const headerMenu = document.getElementById('headerMenu');
  if (headerMenu) {
    headerMenu.addEventListener('click', () => {
      showToast('Menu coming soon', 'info');
    });
  }

  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
      if (confirm('Clear all chat history? This cannot be undone.')) {
        const { clearAllChats } = await import('./store.js');
        await clearAllChats();
        showToast('History cleared', 'success');
      }
    });
  }

  const exportMemoryBtn = document.getElementById('exportMemoryBtn');
  if (exportMemoryBtn) {
    exportMemoryBtn.addEventListener('click', async () => {
      const { exportData } = await import('./store.js');
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aether-memory.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Memory exported', 'success');
    });
  }

  const importMemoryBtn = document.getElementById('importMemoryBtn');
  const importFileInput = document.getElementById('importFileInput');
  if (importMemoryBtn && importFileInput) {
    importMemoryBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const { importData } = await import('./store.js');
        await importData(data);
        showToast('Memory imported', 'success');
      } catch (err) {
        showToast('Failed to import: ' + err.message, 'error');
      }
      importFileInput.value = '';
    });
  }

  const showQrBtn = document.getElementById('showQrBtn');
  if (showQrBtn) {
    showQrBtn.addEventListener('click', async () => {
      const { generateQRCode, hostSession } = await import('./sync.js');
      await hostSession();
      const qrContainer = document.getElementById('qrContainer');
      if (qrContainer) {
        qrContainer.classList.remove('hidden');
        qrContainer.innerHTML = '';
        const qr = generateQRCode(window.location.href);
        qrContainer.appendChild(qr);
        showToast('QR Code generated', 'success');
      }
    });
  }

  const joinDeviceBtn = document.getElementById('joinDeviceBtn');
  if (joinDeviceBtn) {
    joinDeviceBtn.addEventListener('click', async () => {
      const hostIpInput = document.getElementById('hostIpInput');
      if (hostIpInput && hostIpInput.value) {
        const { joinSession } = await import('./sync.js');
        await joinSession(hostIpInput.value);
        showToast('Connecting to device...', 'info');
      } else {
        showToast('Enter host IP address', 'error');
      }
    });
  }
}

// Removed - conflicts with agents.js initializeAgentsUI()
// function initializeAgents() { ... }

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
window.openModal = openModal;
window.closeModal = closeModal;