// Aether PWA - Controller

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');

let conversation = [];

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    sendBtn.disabled = !this.value.trim();
});

// Send on Enter (without shift)
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

settingsBtn.addEventListener('click', openSettings);

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // Add user message
    addMessage('user', text);
    conversation.push({ role: 'user', content: text });
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing indicator
    showTyping();

    try {
        const response = await aiService.chat(conversation);
        
        removeTyping();
        addMessage('assistant', response.content);
        conversation.push({ role: 'assistant', content: response.content });
    } catch (error) {
        removeTyping();
        addMessage('system', `Error: ${error.message}`);
    }
}

function addMessage(role, content) {
    // Remove empty state if exists
    const emptyState = messagesContainer.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `
        <div class="role-label">${role === 'user' ? 'You' : 'Aether'}</div>
        <div class="content">${escapeHtml(content)}</div>
    `;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'message assistant typing';
    div.id = 'typingIndicator';
    div.innerHTML = `
        <div class="role-label">Aether</div>
        <div class="typing"><span></span><span></span><span></span></div>
    `;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openSettings() {
    const keys = aiService.loadKeys();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: #16161a; padding: 24px; border-radius: 16px; width: 90%; max-width: 400px; border: 1px solid #27272a;">
            <h2 style="margin-bottom: 20px;">Settings - API Keys</h2>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; color: #a1a1aa;">OpenRouter API Key</label>
                <input type="password" id="openrouterKey" value="${keys.openrouter}" 
                    style="width: 100%; padding: 10px; background: #1e1e24; border: 1px solid #27272a; border-radius: 8px; color: white;">
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; color: #a1a1aa;">Anthropic API Key</label>
                <input type="password" id="anthropicKey" value="${keys.anthropic}" 
                    style="width: 100%; padding: 10px; background: #1e1e24; border: 1px solid #27272a; border-radius: 8px; color: white;">
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; color: #a1a1aa;">OpenAI API Key</label>
                <input type="password" id="openaiKey" value="${keys.openai}" 
                    style="width: 100%; padding: 10px; background: #1e1e24; border: 1px solid #27272a; border-radius: 8px; color: white;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="saveKeys" checked>
                    <span style="color: #a1a1aa;">Save keys to this device</span>
                </label>
            </div>
            
            <div style="display: flex; gap: 12px;">
                <button id="saveSettings" style="flex: 1; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Save
                </button>
                <button id="closeSettings" style="padding: 12px 20px; background: transparent; color: #a1a1aa; border: 1px solid #27272a; border-radius: 8px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#saveSettings').addEventListener('click', () => {
        const newKeys = {
            openrouter: modal.querySelector('#openrouterKey').value,
            anthropic: modal.querySelector('#anthropicKey').value,
            openai: modal.querySelector('#openaiKey').value,
        };
        
        if (modal.querySelector('#saveKeys').checked) {
            aiService.saveKeys(newKeys);
        } else {
            aiService.apiKeys = newKeys;
        }
        
        modal.remove();
        alert('Settings saved!');
    });
    
    modal.querySelector('#closeSettings').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Check for API keys on load
if (!aiService.hasKeys()) {
    setTimeout(openSettings, 500);
}
