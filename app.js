// Aether PWA - API Service

const API_BASE = 'https://aether-pwa.onrender.com/api';

class AIService {
    constructor() {
        this.baseUrl = API_BASE;
        this.apiKeys = this.loadKeys();
        this.defaultModel = 'deepseek/deepseek-chat';
    }

    loadKeys() {
        return {
            openrouter: localStorage.getItem('aether_openrouter_key') || '',
            anthropic: localStorage.getItem('aether_anthropic_key') || '',
            openai: localStorage.getItem('aether_openai_key') || '',
            google: localStorage.getItem('aether_google_key') || '',
        };
    }

    saveKeys(keys) {
        Object.entries(keys).forEach(([key, value]) => {
            if (value) {
                localStorage.setItem(`aether_${key}_key`, value);
            }
        });
        this.apiKeys = this.loadKeys();
    }

    hasKeys() {
        return Object.values(this.apiKeys).some(v => v);
    }

    async chat(messages, options = {}) {
        const { model, temperature, maxTokens, effort } = options;
        
        const response = await fetch(`${this.baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                model: model || this.defaultModel,
                temperature: temperature ?? 0.7,
                max_tokens: maxTokens ?? 4096,
                effort: effort ?? 'deep'
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Chat failed: ${response.statusText}`);
        }

        return response.json();
    }
}

const aiService = new AIService();
