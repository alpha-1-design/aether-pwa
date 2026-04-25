// js/api.js - LLM API Integration

const PROVIDER_ENDPOINTS = {
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
    groq: "https://api.groq.com/openai/v1/chat/completions",
    cerebras: "https://api.cerebras.cloud/v1/chat/completions",
    google: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    opencode: "https://opencode.ai/zen/v1/chat/completions",
    huggingface: "https://api-inference.huggingface.co/models/{model}",
    cohere: "https://api.cohere.ai/v1/chat",
    github: "https://models.inference.ai.azure.com/openai/deployments/{model}/chat/completions",
    cloudflare: "https://api.cloudflare.com/client/v4/ai/run/{model}",
    mistral: "https://api.mistral.ai/v1/chat/completions",
    openai: "https://api.openai.com/v1/chat/completions",
    anthropic: "https://api.anthropic.com/v1/messages"
};

const FREE_MODELS = {
    openrouter: ["google/gemma-3-27b-it", "qwen/qwen3-30b-a3b", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct"],
    groq: ["llama-3.3-70b-specdec", "mixtral-8x7b-32768", "deepseek-r1-distill-qwen-32b"],
    cerebras: ["llama-3.3-70b"],
    google: ["gemini-2.0-flash-exp", "gemini-1.5-flash"],
    opencode: ["big-pickle", "MiniMax-M2.5-Free", "GLM-4.7-Free", "Kimi-K2.5-Free"],
    huggingface: ["Qwen/Qwen2.5-Coder-32B-Instruct"],
    openai: ["gpt-4o-mini"],
    anthropic: ["claude-3-haiku-20240307"]
};

function getHeaders(provider, apiKey) {
    const baseHeaders = { "Content-Type": "application/json" };
    
    switch (provider) {
        case "anthropic":
            return { ...baseHeaders, "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
        case "google":
        case "huggingface":
            return { ...baseHeaders, "Authorization": `Bearer ${apiKey}` };
        default:
            return { ...baseHeaders, "Authorization": `Bearer ${apiKey}` };
    }
}

function buildPayload(provider, model, messages, stream = false) {
    const basePayload = { messages, stream };

    switch (provider) {
        case "anthropic":
            return {
                model,
                messages,
                max_tokens: 4096,
                stream
            };
        case "google":
            return {
                contents: messages.map(m => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }]
                })),
                generationConfig: { temperature: 0.7 }
            };
        case "openai":
        case "groq":
        case "openrouter":
        case "cerebras":
        case "mistral":
            return { model, ...basePayload };
        case "opencode":
            return { model, messages, stream };
        case "huggingface":
            return { inputs: messages[messages.length - 1]?.content || "" };
        case "cloudflare":
            return { messages };
        default:
            return { model, ...basePayload };
    }
}

function getEndpoint(provider, model) {
    let endpoint = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openrouter;
    return endpoint.replace("{model}", encodeURIComponent(model));
}

function getStreamingEndpoint(provider, model) {
    const endpoint = getEndpoint(provider, model);
    if (provider === "google") {
        return endpoint.replace("generateContent", "streamGenerateContent");
    }
    return endpoint;
}

export async function getAvailableModels(provider, apiKey) {
    if (FREE_MODELS[provider]) {
        return FREE_MODELS[provider];
    }
    
    try {
        if (provider === "openrouter") {
            const response = await fetch("https://openrouter.ai/api/v1/models", {
                headers: { "Authorization": `Bearer ${apiKey}` }
            });
            const data = await response.json();
            return data.data?.map(m => m.id) || [];
        }
    } catch (e) {
        console.error("Failed to fetch models:", e);
    }
    return [];
}

export async function sendMessageToAI(message, provider, model, history) {
    const endpoint = getEndpoint(provider, model);
    const payload = buildPayload(provider, model, history);
    const headers = getHeaders(provider, arguments[3] || localStorage.getItem(`aether_api_key_${provider}`));
    
    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (provider === "anthropic") {
        return data.content?.[0]?.text || "";
    } else if (provider === "google") {
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider === "openrouter" || provider === "openai" || provider === "groq" || provider === "cerebras" || provider === "mistral") {
        return data.choices?.[0]?.message?.content || "";
    } else {
        return data.generated_text || data.content || JSON.stringify(data);
    }
}

export async function* streamMessageToAI(message, provider, model, history, apiKey) {
    const endpoint = getStreamingEndpoint(provider, model);
    const payload = buildPayload(provider, model, history, true);
    const headers = getHeaders(provider, apiKey);

    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (line.trim() && line.startsWith("data:") && !line.includes("[DONE]")) {
                const jsonStr = line.slice(5).trim();
                if (jsonStr) {
                    try {
                        const data = JSON.parse(jsonStr);
                        let content = "";
                        
                        if (provider === "anthropic") {
                            content = data.content?.[0]?.text || "";
                        } else if (provider === "google") {
                            content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        } else {
                            content = data.choices?.[0]?.delta?.content || data.token || "";
                        }
                        
                        if (content) yield content;
                    } catch (e) {}
                }
            }
        }
    }
}

export { FREE_MODELS, PROVIDER_ENDPOINTS };