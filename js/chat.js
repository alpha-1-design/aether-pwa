// Chat functionality for Aether PWA
import { initializeInputHandlers } from './chat.js';

let messageHandler = null;

export function initializeChatUI() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const messagesContainer = document.getElementById('messages');
  
  if (!input || !sendBtn || !messagesContainer) return;
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim();
    autoResizeTextarea(input);
  });
  
  sendBtn.addEventListener('click', () => sendMessage());
  
  loadMessages();
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text) return;
  
  addMessage('user', text);
  input.value = '';
  document.getElementById('sendBtn').disabled = true;
  autoResizeTextarea(input);
  
  const typing = document.getElementById('typingIndicator');
  typing?.classList.remove('hidden');
  
  try {
    const provider = localStorage.getItem('aether_default_provider') || 'openrouter';
    const model = localStorage.getItem('aether_default_model') || 'google/gemma-3-27b-it';
    const apiKeys = JSON.parse(localStorage.getItem('aether_api_keys') || '{}');
    const apiKey = apiKeys[provider];
    
    if (!apiKey) {
      addMessage('assistant', 'Please configure an API key in Settings.');
      return;
    }
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        model,
        apiKey,
        messages: [{ role: 'user', content: text }],
        stream: false
      })
    });
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response';
    addMessage('assistant', content);
  } catch (err) {
    addMessage('assistant', `Error: ${err.message}`);
  } finally {
    typing?.classList.add('hidden');
  }
}

function addMessage(role, content) {
  const container = document.getElementById('messages');
  if (!container) return;
  
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `<div class="message-content">${marked.parse(content)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function loadMessages() {
  // Load from localStorage or API
  const saved = localStorage.getItem('aether_current_messages');
  if (saved) {
    const messages = JSON.parse(saved);
    messages.forEach(m => addMessage(m.role, m.content));
  }
}
