// Aether PWA - Chat Component (Reborn v1.0.0)
import { getSetting, saveSetting, getSettingAsync } from './store.js';
import { getAPI } from './api.js';
import { showError, showToast } from './app.js';

let appRef = null;
let conversation = [];
let currentSessionId = null;
let totalTokens = 0;

export function initChat(app) {
    appRef = app;
    bindEvents();
    loadConversation();
    setupForkButton();
}

function bindEvents() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const searchBtn = document.getElementById('searchBtn');
    const dropZone = document.getElementById('dropZone');

    if (messageInput) {
        messageInput.addEventListener('input', () => {
            autoResize(messageInput);
            sendBtn.disabled = !messageInput.value.trim();
        });
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (attachBtn) attachBtn.addEventListener('click', () => showFilePicker());
    if (voiceBtn) voiceBtn.addEventListener('click', toggleVoice);
    if (searchBtn) searchBtn.addEventListener('click', showSearchModal);
    if (dropZone) setupDropZone(dropZone);
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function loadConversation() {
    try {
        const saved = await getSettingAsync('current_conversation');
        const sessionId = await getSettingAsync('current_session_id');
        
        if (saved && Array.isArray(saved)) {
            conversation = saved;
            conversation.forEach(msg => addMessageToUI(msg.role, msg.content, false));
            currentSessionId = sessionId || generateSessionId();
            updateHeaderTokenCount();
        } else {
            currentSessionId = generateSessionId();
        }
    } catch (e) {
        console.error('Failed to load conversation:', e);
        currentSessionId = generateSessionId();
    }
}

async function saveConversation() {
    try {
        await saveSetting('current_conversation', conversation);
        await saveSetting('current_session_id', currentSessionId);
    } catch (e) {
        console.error('Failed to save conversation:', e);
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const text = input.value.trim();
    
    if (!text) return;

    const api = getAPI();
    const apiKey = api.getAPIKey && api.getAPIKey(api.currentProvider);
    
    if (!apiKey) {
        handleError({ message: 'No API key configured. Go to Settings → API Keys to add your key.', code: 'NO_API_KEY' });
        return;
    }

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    addMessageToUI('user', text);
    conversation.push({ role: 'user', content: text, timestamp: Date.now() });
    await saveConversation();

    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.classList.remove('hidden');

    try {
        const streaming = await getSettingAsync('streaming');
        
        if (streaming !== false) {
            await streamResponse(api);
        } else {
            await regularResponse(api);
        }
    } catch (error) {
        handleError(error);
    } finally {
        if (typingIndicator) typingIndicator.classList.add('hidden');
    }
}

async function regularResponse(api) {
    const messages = conversation.map(m => ({ role: m.role, content: m.content }));
    const response = await api.chat(messages);
    
    if (response.usage) {
        updateTokenDisplay(response.usage);
    }
    
    addMessageToUI('assistant', response.content);
    conversation.push({ role: 'assistant', content: response.content, timestamp: Date.now() });
    await saveConversation();
}

async function streamResponse(api) {
    const messages = conversation.map(m => ({ role: m.role, content: m.content }));
    const messageDiv = createMessageDiv('assistant', '');
    const contentDiv = messageDiv.querySelector('.content');
    messageDiv.classList.add('streaming');
    
    const messagesContainer = document.getElementById('messages');
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    let fullContent = '';
    let tokenCount = 0;
    
    for await (const chunk of api.streamChat(messages)) {
        fullContent += chunk;
        contentDiv.innerHTML = formatContent(fullContent);
        scrollToBottom();
    }

    messageDiv.classList.remove('streaming');
    
    addMessageToUI('assistant', fullContent);
    conversation.push({ role: 'assistant', content: fullContent, timestamp: Date.now() });
    await saveConversation();
}

function handleError(error) {
    let message = error.message || 'An unexpected error occurred';
    let code = error.code || 'UNKNOWN';
    
    if (code === 'VALIDATION_ERROR') {
        message = error.details || message;
    } else if (code === 'HTTP_401') {
        message = 'Invalid API key. Please check your settings.';
    } else if (code === 'HTTP_429') {
        message = 'Rate limit exceeded. Please wait and try again.';
    } else if (code === 'HTTP_429') {
        message = 'Rate limit exceeded. Please wait and try again.';
    } else if (code.startsWith('HTTP_5')) {
        message = 'Service temporarily unavailable. Please try again later.';
    }
    
    addMessageToUI('system', `⚠️ ${message}`);
    showError(message, code);
}

function addMessageToUI(role, content, animate = true) {
    const messagesContainer = document.getElementById('messages');
    const emptyState = messagesContainer.querySelector('.empty-state');
    
    if (emptyState) emptyState.remove();

    const messageDiv = createMessageDiv(role, content);
    if (!animate) messageDiv.style.animation = 'none';
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function createMessageDiv(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    const contentHtml = formatContent(content);
    const label = role === 'user' ? 'You' : (role === 'system' ? 'System' : 'Aether');
    
    div.innerHTML = `
        <div class="role-label">${label}</div>
        <div class="content">${contentHtml}</div>
    `;

    return div;
}

function formatContent(text) {
    if (!text) return '';
    let formatted = escapeHtml(text);
    
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return createCodeBlock(lang || 'text', code.trim());
    });
    
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    return formatted;
}

function createCodeBlock(language, code) {
    const lang = language.toLowerCase();
    const langLabel = getLanguageLabel(lang);
    const filename = getFilename(lang);
    
    return `
        <div class="code-block">
            <div class="code-header">
                <span class="code-lang">${langLabel}</span>
                ${filename ? `<span class="code-filename">${filename}</span>` : ''}
                <div class="code-actions">
                    <button class="code-action-btn copy-btn" title="Copy">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                    </button>
                    <button class="code-action-btn run-btn" title="Run">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    </button>
                </div>
            </div>
            <pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>
        </div>
    `;
}

function getLanguageLabel(lang) {
    const labels = {
        python: 'Python', javascript: 'JavaScript', js: 'JavaScript', typescript: 'TypeScript',
        html: 'HTML', css: 'CSS', json: 'JSON', bash: 'Bash', shell: 'Shell',
        ruby: 'Ruby', go: 'Go', rust: 'Rust', java: 'Java', cpp: 'C++', c: 'C',
    };
    return labels[lang] || lang;
}

function getFilename(lang) {
    const filenames = { python: 'main.py', javascript: 'index.js', js: 'index.js',
        typescript: 'index.ts', html: 'index.html', css: 'style.css', json: 'data.json' };
    return filenames[lang] || null;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateTokenDisplay(usage) {
    totalTokens += usage.total || 0;
    updateHeaderTokenCount();
}

function updateHeaderTokenCount() {
    const header = document.querySelector('.chat-header');
    if (!header) return;
    
    let tokenBadge = header.querySelector('.token-badge');
    if (!tokenBadge) {
        tokenBadge = document.createElement('div');
        tokenBadge.className = 'token-badge';
        header.appendChild(tokenBadge);
    }
    tokenBadge.textContent = totalTokens > 0 ? `${totalTokens.toLocaleString()} tokens` : '';
}

function setupForkButton() {
    const header = document.querySelector('.chat-header');
    if (!header) return;
    
    let forkBtn = header.querySelector('.fork-btn');
    if (!forkBtn) {
        forkBtn = document.createElement('button');
        forkBtn.className = 'icon-btn fork-btn';
        forkBtn.title = 'Fork conversation';
        forkBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
            <path d="M18 9v1.5a2.5 2.5 0 01-5 0V6a3 3 0 016 0"/><path d="M6 9v1.5a2.5 2.5 0 01-5 0V6a3 3 0 016 0"/>
        </svg>`;
        forkBtn.addEventListener('click', forkConversation);
        header.appendChild(forkBtn);
    }
}

async function forkConversation() {
    if (conversation.length === 0) {
        showToast('No conversation to fork');
        return;
    }
    
    const newSessionId = generateSessionId();
    const forked = conversation.map(m => ({ ...m }));
    
    await saveSetting('forked_conversations', [
        ...(await getSettingAsync('forked_conversations') || []),
        { id: currentSessionId, messages: forked, forkedAt: Date.now() }
    ]);
    
    currentSessionId = newSessionId;
    conversation = [];
    await saveConversation();
    
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';
    
    addMessageToUI('system', 'Conversation forked. Start a new conversation below.');
    showToast('Conversation forked');
}

function showFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.pdf,.txt,.json,.md';
    input.addEventListener('change', (e) => handleFiles(e.target.files));
    input.click();
}

function handleFiles(files) {
    Array.from(files).forEach(file => {
        addMessageToUI('user', `📎 Attached: ${file.name}`);
    });
}

function setupDropZone(dropZone) {
    document.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.remove('hidden'); });
    document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) dropZone.classList.add('hidden'); });
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.add('hidden');
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
}

let recognition = null;
let isRecording = false;

function toggleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showError('Voice input not supported', 'NOT_SUPPORTED');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event) => {
            const input = document.getElementById('messageInput');
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
            }
            if (final) input.value += ' ' + final;
        };
        
        recognition.onerror = (e) => { showError(e.error, 'VOICE_ERROR'); };
        recognition.onend = () => { isRecording = false; updateVoiceButton(); };
    }

    if (isRecording) { recognition.stop(); } else { recognition.start(); isRecording = true; }
    updateVoiceButton();
}

function updateVoiceButton() {
    const btn = document.getElementById('voiceBtn');
    if (btn) btn.classList.toggle('recording', isRecording);
}

function showSearchModal() {
    const query = prompt('Enter search query:');
    if (query) performSearch(query);
}

async function performSearch(query) {
    addMessageToUI('user', `🔍 Search: ${query}`);
    
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.classList.remove('hidden');

    try {
        const api = getAPI();
        const results = await api.search(query);
        addMessageToUI('assistant', `Results for "${query}":\n\n${formatSearchResults(results.results || results)}`);
    } catch (error) {
        handleError(error);
    } finally {
        if (typingIndicator) typingIndicator.classList.add('hidden');
    }
}

function formatSearchResults(results) {
    if (!results || !results.length) return 'No results found.';
    return results.slice(0, 5).map((r, i) => `${i + 1}. **${r.title}**\n${r.snippet || r.url}`).join('\n\n');
}

window.copyCode = function(btn) {
    const code = btn.closest('.code-block').querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.innerHTML = 'Copied!';
        setTimeout(() => { btn.innerHTML = 'Copy'; }, 2000);
    });
};

window.runCode = async function(btn) {
    const codeBlock = btn.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    const lang = codeBlock.querySelector('.code-lang').textContent.toLowerCase();
    
    btn.innerHTML = 'Running...';
    btn.disabled = true;

    try {
        const api = getAPI();
        const result = await api.execute(code, lang);
        
        const outputDiv = document.createElement('div');
        outputDiv.className = 'code-output';
        
        const output = result.run?.output || result.output || result.error || 'No output';
        const isError = result.run?.code !== 0 && result.exit_code !== 0;
        
        outputDiv.innerHTML = `
            <div class="output-header">Output</div>
            <pre class="${isError ? 'error' : 'success'}">${escapeHtml(output)}</pre>
        `;
        
        codeBlock.parentNode.appendChild(outputDiv);
    } catch (error) {
        const outputDiv = document.createElement('div');
        outputDiv.className = 'code-output';
        outputDiv.innerHTML = `<div class="output-header">Error</div><pre class="error">${error.message}</pre>`;
        codeBlock.parentNode.appendChild(outputDiv);
    } finally {
        btn.innerHTML = 'Run';
        btn.disabled = false;
    }
};

export default { initChat };