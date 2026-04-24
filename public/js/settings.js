// Aether PWA - Settings Component
import { getAllAPIKeys, saveAPIKey, getSetting, saveSetting, getAll, clearSessions, clearMemory, saveAPIKey as saveApiKey } from './store.js';
import { MODELS } from './api.js';

let appRef = null;

const PROVIDER_LINKS = {
    openrouter: 'https://openrouter.ai/keys',
    groq: 'https://console.groq.com/keys',
    cerebras: 'https://cloud.cerebras.ai/',
    google: 'https://aistudio.google.com/app/apikey',
    opencode: 'https://opencode.ai/auth',
    huggingface: 'https://huggingface.co/settings/tokens',
    cohere: 'https://dashboard.cohere.com/api-keys',
    github: 'https://github.com/settings/tokens',
    cloudflare: 'https://dash.cloudflare.com/workers-ai',
    mistral: 'https://console.mistral.ai/',
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/',
};

export function initSettings(app) {
    appRef = app;
    loadSettings();
    bindEvents();
    populateModelSelects();
}

function bindEvents() {
    document.addEventListener('settingsViewOpen', () => {
        renderSavedKeys();
    });

    const sectionHeaders = document.querySelectorAll('.section-header');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
    });

    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', saveApiKeyFromInput);
    }

    const getKeyLinkBtn = document.getElementById('getKeyLinkBtn');
    if (getKeyLinkBtn) {
        getKeyLinkBtn.addEventListener('click', openGetKeyLink);
    }

    const defaultModelSelect = document.getElementById('defaultModelSelect');
    if (defaultModelSelect) {
        defaultModelSelect.addEventListener('change', (e) => {
            saveSetting('default_model', e.target.value);
        });
    }

    const streamingToggle = document.getElementById('streamingToggle');
    if (streamingToggle) {
        streamingToggle.addEventListener('change', (e) => {
            saveSetting('streaming', e.target.checked);
        });
    }

    const executeToggle = document.getElementById('executeToggle');
    if (executeToggle) {
        executeToggle.addEventListener('change', (e) => {
            saveSetting('execute_auto', e.target.checked);
        });
    }
    
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (e) => {
            const size = e.target.value;
            document.documentElement.setAttribute('data-font-size', size);
            localStorage.setItem('aether_font_size', size);
            const valueSpan = document.getElementById('fontSizeValue');
            if (valueSpan) valueSpan.textContent = size + 'px';
        });
    }

    const speechToggle = document.getElementById('speechToggle');
    if (speechToggle) {
        speechToggle.addEventListener('change', (e) => {
            saveSetting('speech_enabled', e.target.checked);
        });
    }

    const voiceMemoToggle = document.getElementById('voiceMemoToggle');
    if (voiceMemoToggle) {
        voiceMemoToggle.addEventListener('change', (e) => {
            saveSetting('voice_memo', e.target.checked);
        });
    }

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }

    const exportMemoryBtn = document.getElementById('exportMemoryBtn');
    if (exportMemoryBtn) {
        exportMemoryBtn.addEventListener('click', exportMemory);
    }

    const importMemoryBtn = document.getElementById('importMemoryBtn');
    if (importMemoryBtn) {
        importMemoryBtn.addEventListener('click', () => document.getElementById('importFileInput').click());
    }

    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) {
        importFileInput.addEventListener('change', importMemory);
    }

    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => setCrossDeviceMode(btn.dataset.mode));
    });
}

function loadSettings() {
    const theme = getSetting('theme', 'space-dark');
    const fontSize = getSetting('font_size', '16');
    const streaming = getSetting('streaming', true);
    const executeAuto = getSetting('execute_auto', false);
    const speechEnabled = getSetting('speech_enabled', false);
    const voiceMemo = getSetting('voice_memo', false);

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);

    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.value = fontSize;
    }

    const streamingToggle = document.getElementById('streamingToggle');
    if (streamingToggle) {
        streamingToggle.checked = streaming;
    }

    const executeToggle = document.getElementById('executeToggle');
    if (executeToggle) {
        executeToggle.checked = executeAuto;
    }

    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    const speechToggle = document.getElementById('speechToggle');
    if (speechToggle) speechToggle.checked = speechEnabled;

    const voiceMemoToggle = document.getElementById('voiceMemoToggle');
    if (voiceMemoToggle) voiceMemoToggle.checked = voiceMemo;
}

function toggleSection(header) {
    const section = header.closest('.settings-section');
    const content = section.querySelector('.section-content');
    const isOpen = !content.classList.contains('hidden');
    
    content.classList.toggle('hidden');
    header.classList.toggle('open', !isOpen);
}

function saveApiKeyFromInput() {
    const providerSelect = document.getElementById('apiProviderSelect');
    const keyInput = document.getElementById('apiKeyInput');
    
    const provider = providerSelect.value;
    const key = keyInput.value.trim();

    if (!key) {
        alert('Please enter an API key.');
        return;
    }

    saveApiKey(provider, key);
    keyInput.value = '';
    renderSavedKeys();
    populateModelSelects();
    alert(`${provider} API key saved!`);
}

function openGetKeyLink() {
    const provider = document.getElementById('apiProviderSelect').value;
    const url = PROVIDER_LINKS[provider];
    if (url) {
        window.open(url, '_blank');
    }
}

function renderSavedKeys() {
    const container = document.getElementById('savedKeys');
    if (!container) return;

    const keys = getAllAPIKeys();
    const hasKeys = Object.values(keys).some(v => v);

    if (!hasKeys) {
        container.innerHTML = '<p class="no-keys">No API keys configured yet.</p>';
        return;
    }

    container.innerHTML = Object.entries(keys)
        .filter(([, key]) => key)
        .map(([provider, key]) => `
            <div class="saved-key-item">
                <span class="key-provider">${provider}</span>
                <span class="key-value">${key.substring(0, 8)}...</span>
                <button class="icon-btn" onclick="deleteApiKey('${provider}')" title="Delete">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `).join('');
}

window.deleteApiKey = function(provider) {
    if (!confirm(`Remove ${provider} API key?`)) return;
    
    saveApiKey(provider, '');
    renderSavedKeys();
    populateModelSelects();
};

function populateModelSelects() {
    const select = document.getElementById('defaultModelSelect');
    if (!select) return;

    const keys = getAllAPIKeys();
    let models = [];

    Object.entries(keys).forEach(([provider, key]) => {
        if (key && MODELS[provider]) {
            MODELS[provider].forEach(model => {
                models.push({
                    ...model,
                    provider: provider,
                    id: `${provider}/${model.id}`
                });
            });
        }
    });

    if (!models.length) {
        MODELS.openrouter.forEach(model => {
            models.push({ ...model, provider: 'openrouter', id: `openrouter/${model.id}` });
        });
    }

    select.innerHTML = models.map(m => `
        <option value="${m.id}" data-provider="${m.provider}" ${m.free ? 'data-free="true"' : ''}>
            ${m.name} ${m.free ? '(Free)' : ''} - ${m.provider}
        </option>
    `).join('');

    const defaultModel = getSetting('default_model');
    if (defaultModel) {
        select.value = defaultModel;
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveSetting('theme', theme);

    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
}

async function clearHistory() {
    if (!confirm('Clear all chat history? This cannot be undone.')) return;

    await clearSessions();
    saveSetting('current_conversation', []);
    alert('Chat history cleared.');
}

async function exportMemory() {
    const sessions = await getAll('sessions');
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        sessions: sessions
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether-memory-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function importMemory(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.sessions && Array.isArray(data.sessions)) {
            for (const session of data.sessions) {
                if (session.messages) {
                    await saveSetting('current_conversation', session.messages);
                }
            }
        }

        alert('Memory imported successfully!');
    } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import memory. Invalid file format.');
    }
}

function setCrossDeviceMode(mode) {
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

    const hostInfo = document.getElementById('hostInfo');
    const joinInfo = document.getElementById('joinInfo');

    hostInfo.classList.toggle('hidden', mode !== 'host');
    joinInfo.classList.toggle('hidden', mode !== 'join');

    if (mode === 'host') {
        displayLocalIP();
    }
}

async function displayLocalIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const ipSpan = document.getElementById('localIp');
        if (ipSpan) {
            ipSpan.textContent = data.ip;
        }
    } catch (error) {
        console.error('Failed to get IP:', error);
    }
}

export default { initSettings };