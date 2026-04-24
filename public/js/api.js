// Aether PWA - API Module (Reborn v1.0.0)
import { getAPIKey, getSetting, getSettingAsync } from './store.js';

const API_BASE = '/api';

const PROVIDER_ENDPOINTS = {
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    cerebras: 'https://api.cerebras.ai/v1/chat/completions',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    opencode: 'https://opencode.ai/zen/v1/chat/completions',
    huggingface: 'https://api-inference.huggingface.co/models',
    cohere: 'https://api.cohere.ai/v2/chat',
    github: 'https://models.inference.github.io',
    cloudflare: 'https://api.cloudflare.com/client/v4/ai/run/@cf',
    mistral: 'https://api.mistral.ai/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages'
};

const MODELS = {
    openrouter: [
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', free: true, context: 64000 },
        { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', free: true, context: 8192 },
        { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', free: true, context: 8192 },
        { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', free: true, context: 1000000 },
        { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', free: true, context: 32768 },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', free: false, context: 200000 },
        { id: 'openai/gpt-4o', name: 'GPT-4o', free: false, context: 128000 },
    ],
    groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', free: true, context: 128000 },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', free: true, context: 128000 },
        { id: 'gemma2-9b-it', name: 'Gemma 2 9B', free: true, context: 8192 },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1', free: true, context: 128000 },
    ],
    cerebras: [
        { id: 'llama3.1-8b', name: 'Llama 3.1 8B', free: true, context: 128000 },
        { id: 'gpt-oss-120b', name: 'GPT OSS 120B', free: true, context: 128000 },
    ],
    google: [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', free: true, context: 1000000 },
        { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', free: true, context: 1000000 },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', free: false, context: 1000000 },
    ],
    opencode: [
        { id: 'big-pickle', name: 'Big Pickle', free: true, context: 200000 },
        { id: 'minimax-m2.5-free', name: 'MiniMax M2.5 Free', free: true, context: 128000 },
        { id: 'glm-4.7-free', name: 'GLM 4.7 Free', free: true, context: 128000 },
        { id: 'kimi-k2.5-free', name: 'Kimi K2.5 Free', free: true, context: 128000 },
    ],
    huggingface: [
        { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', free: true, context: 128000 },
        { id: 'mistralai/Mistral-7B-Instruct', name: 'Mistral 7B', free: true, context: 32768 },
    ],
    cohere: [
        { id: 'command-r-plus', name: 'Command R+', free: true, context: 128000 },
        { id: 'command-r7b-12-2024', name: 'Command R7B', free: true, context: 128000 },
    ],
    github: [
        { id: 'Phi-4', name: 'Phi-4', free: true, context: 32768 },
        { id: 'Llama-3.2', name: 'Llama 3.2', free: true, context: 128000 },
    ],
    cloudflare: [
        { id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', free: true, context: 128000 },
        { id: '@cf/mistralai/mistral-7b', name: 'Mistral 7B', free: true, context: 32768 },
    ],
    mistral: [
        { id: 'mistral-small-latest', name: 'Mistral Small', free: false, context: 128000 },
        { id: 'mistral-medium-latest', name: 'Mistral Medium', free: false, context: 128000 },
    ],
    openai: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', free: true, context: 16385 },
        { id: 'gpt-4o', name: 'GPT-4o', free: false, context: 128000 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: false, context: 128000 },
    ],
    anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false, context: 200000 },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', free: false, context: 200000 },
    ]
};

class AetherAPI {
    constructor(store) {
        this.store = store;
        this.currentProvider = 'openrouter';
        this.currentModel = 'deepseek/deepseek-chat';
        this.usage = { total: 0 };
    }

    async chat(messages, options = {}) {
        const provider = options.provider || this.currentProvider;
        const model = options.model || this.currentModel;
        
        const apiKey = getAPIKey(provider);
        if (!apiKey) {
            return this.getDemoResponse(messages, model);
        }

        const messagesWithSystem = this.prepareMessages(messages, provider);
        
        const payload = {
            provider: provider,
            model: model,
            apiKey: apiKey,
            messages: messagesWithSystem,
        };

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `Request failed: ${response.status}`);
            }

            const result = await response.json();
            this.usage.total += (result.usage?.total || 0);
            return result;
        } catch (e) {
            console.warn('Backend call failed, trying direct:', e.message);
            return this.sendDirect(provider, model, apiKey, messagesWithSystem);
        }
    }

    async *streamChat(messages, options = {}) {
        const provider = options.provider || this.currentProvider;
        const model = options.model || this.currentModel;
        
        const apiKey = getAPIKey(provider);
        if (!apiKey) {
            const demo = this.getDemoResponse(messages, model);
            yield demo.content;
            return;
        }

        const messagesWithSystem = this.prepareMessages(messages, provider);
        
        const payload = {
            provider: provider,
            model: model,
            apiKey: apiKey,
            messages: messagesWithSystem,
            stream: true,
        };

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `Request failed: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                yield 'Stream not supported';
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.choices?.[0]?.delta?.content) {
                                    yield data.choices[0].delta.content;
                                }
                            } catch (e) {}
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } catch (e) {
            console.warn('Stream failed, trying direct:', e.message);
            const result = await this.sendDirect(provider, model, apiKey, messagesWithSystem);
            yield result.choices?.[0]?.message?.content || 'Error: ' + e.message;
        }
    }

    async sendDirect(provider, model, apiKey, messages) {
        const endpoint = PROVIDER_ENDPOINTS[provider];
        if (!endpoint) throw new Error(`Unknown provider: ${provider}`);

        const headers = this.getHeaders(provider, apiKey);
        const payload = this.buildPayload(provider, model, messages);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error(`Direct API failed: ${response.status}`);
        }

        return response.json();
    }

    prepareMessages(messages, provider) {
        if (provider === 'google') {
            return messages;
        }
        return messages;
    }

    getHeaders(provider, apiKey) {
        const headers = { 'Content-Type': 'application/json' };
        
        switch (provider) {
            case 'openrouter':
            case 'groq':
            case 'cerebras':
            case 'huggingface':
            case 'cohere':
            case 'mistral':
            case 'openai':
                headers['Authorization'] = `Bearer ${apiKey}`;
                break;
            case 'google':
                headers['Authorization'] = `Bearer ${apiKey}`;
                break;
            case 'anthropic':
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
                break;
            case 'github':
                headers['Authorization'] = `Bearer ${apiKey}`;
                break;
            case 'cloudflare':
                headers['Authorization'] = `Bearer ${apiKey}`;
                break;
        }
        return headers;
    }

    buildPayload(provider, model, messages) {
        if (provider === 'anthropic') {
            return { model, messages, max_tokens: 4096 };
        } else if (provider === 'google') {
            return {
                contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }))
            };
        }
        return { model, messages };
    }

    getDemoResponse(messages, model) {
        const lastMessage = messages[messages.length - 1]?.content || '';
        
        return {
            content: lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')
                ? `Hello! I'm Aether, your AI assistant.\n\nNo API key detected. Go to Settings → API Keys to add your key.\n\nI support: OpenRouter, Groq, Cerebras, Google, OpenCode, and more - many with free models!`
                : `I'm running in demo mode. Add your API key in Settings to enable AI responses.\n\nFree options:\n- OpenRouter (DeepSeek, Llama, Qwen)\n- Groq (ultra-fast)\n- OpenCode Zen (Big Pickle)`,
            demo: true,
        };
    }

    async search(query) {
        try {
            const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            return response.json();
        } catch (e) {
            console.warn('Search backend failed:', e);
            return this.duckduckgoSearch(query);
        }
    }

    async duckduckgoSearch(query) {
        return {
            results: [{
                title: `Search: ${query}`,
                url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                snippet: 'Search failed. Try enabling the backend or search manually.'
            }]
        };
    }

    async execute(code, language = 'python') {
        const languageMap = {
            'js': 'javascript',
            'python': 'python',
            'typescript': 'typescript',
            'html': 'html',
            'css': 'css',
            'bash': 'bash',
            'go': 'go',
            'rust': 'rust',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
        };

        try {
            const response = await fetch(`${API_BASE}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: languageMap[language] || 'python',
                    code: code,
                    version: '*'
                }),
            });

            if (!response.ok) {
                throw new Error(`Execution failed: ${response.status}`);
            }

            return response.json();
        } catch (e) {
            console.warn('Execute backend failed:', e);
            return this.pistonDirect(code, languageMap[language] || 'python');
        }
    }

    async pistonDirect(code, language) {
        try {
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: language,
                    version: '*',
                    files: [{ content: code }]
                }),
            });
            return response.json();
        } catch (e) {
            return { error: 'Code execution unavailable' };
        }
    }

    setProvider(provider) {
        this.currentProvider = provider;
    }

    setModel(model) {
        this.currentModel = model;
    }

    getModels(provider) {
        return MODELS[provider] || [];
    }

    getUsage() {
        return this.usage;
    }

    resetUsage() {
        this.usage = { total: 0 };
    }

    getAPIKey(provider) {
        return getAPIKey(provider || this.currentProvider);
    }

    hasAPIKey(provider) {
        const key = getAPIKey(provider || this.currentProvider);
        return !!(key && key.length > 0);
    }
}

let apiInstance = null;

export function initAPI(store) {
    if (!apiInstance) {
        apiInstance = new AetherAPI(store);
    }
    return apiInstance;
}

export function getAPI() {
    return apiInstance;
}

export { AetherAPI, MODELS, PROVIDER_ENDPOINTS };
export default { initAPI, getAPI, MODELS };