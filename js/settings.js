// js/settings.js (Updated for Sync Integration)

import { sendSyncMessage } from './sync.js'; // Import sendSyncMessage
import { loadChatOptions } from './chat.js'; // For potentially reloading models/agents if settings affect them

// --- DOM Elements for API Key section in settings ---
const apiProviderSelect = document.getElementById('apiProviderSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const getKeyLinkBtn = document.getElementById('getKeyLinkBtn');
const savedKeysContainer = document.getElementById('savedKeys');

// --- API Key Management ---
const API_KEY_STORAGE_PREFIX = 'aether_api_key_'; 

export function saveApiKey(provider) {
    const key = apiKeyInput.value.trim();
    if (!key) {
        alert("API key cannot be empty.");
        return;
    }
    const storageKey = `${API_KEY_STORAGE_PREFIX}${provider}`;
    localStorage.setItem(storageKey, key);
    console.log(`API key for ${provider} saved.`);
    alert(`API key for ${provider} saved successfully!`);
    sendSyncMessage('settings_update', { type: 'api_key_saved', provider: provider }); // Sync settings update
    updateSavedKeysDisplay(); 
    apiKeyInput.value = ''; 
    loadChatOptions(); // Refresh chat options in case new API key enables new models
}

export function getApiKey(provider) {
    const storageKey = `${API_KEY_STORAGE_PREFIX}${provider}`;
    return localStorage.getItem(storageKey);
}

export function removeApiKey(provider) {
    const storageKey = `${API_KEY_STORAGE_PREFIX}${provider}`;
    localStorage.removeItem(storageKey);
    console.log(`API key for ${provider} removed.`);
    alert(`API key for ${provider} removed.`);
    sendSyncMessage('settings_update', { type: 'api_key_removed', provider: provider }); // Sync settings update
    updateSavedKeysDisplay(); 
    loadChatOptions(); // Refresh chat options
}

// Dynamically updates the UI to show which API keys are saved
export function updateSavedKeysDisplay() {
    if (!savedKeysContainer || !apiProviderSelect) {
        console.warn("Saved keys container or provider select element not found.");
        return;
    }
    savedKeysContainer.innerHTML = ''; 

    apiProviderSelect.querySelectorAll('option').forEach(option => {
        const provider = option.value;
        const storageKey = `${API_KEY_STORAGE_PREFIX}${provider}`;
        if (localStorage.getItem(storageKey)) {
            const savedKeyElement = document.createElement('div');
            savedKeyElement.classList.add('saved-key-item');
            savedKeyElement.innerHTML = `
                <span>${provider}</span>
                <button class="remove-key-btn" data-provider="${provider}" title="Remove API Key">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </button>
            `;
            savedKeysContainer.appendChild(savedKeyElement);
        }
    });

    document.querySelectorAll('.remove-key-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const providerToRemove = e.target.closest('button').getAttribute('data-provider');
            if (providerToRemove) {
                removeApiKey(providerToRemove);
            }
        });
    });
}

// --- Initialization ---
export function initializeSettingsUI() {
    // Event listener for the Save API Key button
    if (saveApiKeyBtn && apiKeyInput && apiProviderSelect) {
        saveApiKeyBtn.addEventListener('click', () => {
            const provider = apiProviderSelect.value;
            saveApiKey(provider);
        });
    }

    // Event listener for the "Get API Key" button
    if (getKeyLinkBtn && apiProviderSelect) {
        getKeyLinkBtn.addEventListener('click', () => {
            const provider = apiProviderSelect.value;
            if (provider === 'openrouter') window.open('https://openrouter.ai/keys', '_blank');
            else if (provider === 'groq') window.open('https://console.groq.com/keys', '_blank');
            else if (provider === 'google') window.open('https://makersuite.google.com/app/apikey', '_blank');
            else if (provider === 'openai') window.open('https://platform.openai.com/account/api-keys', '_blank');
            else if (provider === 'anthropic') window.open('https://console.anthropic.com/keys', '_blank');
            else alert('Please visit the provider's website to obtain an API key.');
        });
    }

    // Initial display of saved keys when settings are loaded
    updateSavedKeysDisplay();
}
// Export updateSavedKeysDisplay for sync.js to refresh settings
export { updateSavedKeysDisplay };
