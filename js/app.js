// Aether PWA - Main App Initialization
import { initializeSettingsUI } from './settings.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Aether initializing...');
  
  initializeApp();
  initializeNavigation();
  initializeInputHandlers();
  initializeSettingsSections();
  initializeTheme();
  initializeAgents();
  
  console.log('Aether ready');
});

function initializeApp() {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const dropZone = document.getElementById('dropZone');
  
  if (messageInput) {
    messageInput.addEventListener('input', handleInputChange);
    messageInput.addEventListener('keydown', handleKeyDown);
    messageInput.addEventListener('focus', expandTextarea);
    messageInput.addEventListener('blur', shrinkTextarea);
  }
  
  if (sendBtn) {
    sendBtn.addEventListener('click', handleSend);
  }
  
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
  const attachBtn = document.getElementById('attachBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const searchBtn = document.getElementById('searchBtn');
  
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      showToast('File attachment coming soon', 'info');
    });
  }
  
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      showToast('Voice input coming soon', 'info');
    });
  }
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      showToast('Web search coming soon', 'info');
    });
  }
}

function initializeSettingsSections() {
  const sectionHeaders = document.querySelectorAll('.section-header');
  
  sectionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.settings-section');
      const content = section.querySelector('.section-content');
      const isExpanded = header.getAttribute('aria-expanded') === 'true';
      
      header.setAttribute('aria-expanded', !isExpanded);
      content.classList.toggle('hidden');
    });
  });
}

function initializeTheme() {
  const themeBtns = document.querySelectorAll('.theme-btn');
  
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
      showToast(`Theme: ${theme.replace('-', ' ')}`, 'success');
    });
  });
  
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
}

function initializeAgents() {
  const createAgentBtn = document.getElementById('createAgentBtn');
  const emptyCreateAgentBtn = document.getElementById('emptyCreateAgentBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  
  [createAgentBtn, emptyCreateAgentBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => openModal());
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
}

function initializeDropZone() {
  const dropZone = document.getElementById('dropZone');
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
  
  body.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.add('hidden');
    showToast('File drop coming soon', 'info');
  });
}

function handleInputChange(e) {
  const sendBtn = document.getElementById('sendBtn');
  const messageInput = e.target;
  
  if (sendBtn) {
    sendBtn.disabled = messageInput.value.trim() === '';
  }
  
  autoResizeTextarea(messageInput);
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

function expandTextarea() {
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.style.minHeight = '56px';
  }
}

function shrinkTextarea() {
  const messageInput = document.getElementById('messageInput');
  if (messageInput && messageInput.value.trim() === '') {
    messageInput.style.minHeight = '';
  }
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

async function handleSend() {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  
  if (!messageInput || !sendBtn) return;
  
  const message = messageInput.value.trim();
  if (!message) return;
  
  sendBtn.disabled = true;
  messageInput.value = '';
  
  const payload = { role: 'user', content: message };
  console.log('Message sent:', payload);
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
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut var(--transition-fast) ease forwards';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

window.showToast = showToast;

initializeSettingsUI();