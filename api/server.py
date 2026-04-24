import os
import json
import logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROVIDER_ENDPOINTS = {
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "cerebras": "https://api.cerebras.cloud/v1/chat/completions",
    "google": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    "opencode": "https://opencode.ai/zen/v1/chat/completions",
    "huggingface": "https://api-inference.huggingface.co/providers/{provider}",
    "cohere": "https://api.cohere.ai/v1/chat",
    "github": "https://models.inference.ai.azure.com/openai/deployments/{model}/chat/completions",
    "cloudflare": "https://api.cloudflare.com/client/v4/ai/run/@cf/{model}",
    "mistral": "https://api.mistral.ai/v1/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
    "anthropic": "https://api.anthropic.com/v1/messages"
}

PROVIDER_HEADERS = {
    "openrouter": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "groq": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "cerebras": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "google": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "huggingface": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "cohere": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "github": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "azure-Deployment-Name": "{model}"},
    "cloudflare": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "mistral": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "openai": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    "anthropic": lambda key: {"x-api-key": key, "Content-Type": "application/json", "anthropic-version": "2023-06-01"}
}

FREE_MODELS = {
    "openrouter": ["google/gemma-3-27b-it", "qwen/qwen3-30b-a3b", "deepseek/deepseek-chat"],
    "groq": ["llama-3.3-70b-specdec", "mixtral-8x7b-32768"],
    "cerebras": ["llama-3.3-70b"],
    "google": ["gemini-2.0-flash-exp"],
    "opencode": ["big-pickle", "MiniMax-M2.5-Free", "GLM-4.7-Free", "Kimi-K2.5-Free"],
    "huggingface": ["Qwen/Qwen2.5-Coder-32B-Instruct", "microsoft/Phi-4-mini-instruct"],
    "openai": ["gpt-4o-mini"],
    "anthropic": ["claude-3-haiku-20240307"]
}

def handle_errors(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.warning(f"Validation error: {e}")
            return jsonify({"error": "Invalid request", "details": str(e), "code": "VALIDATION_ERROR"}), 400
        except requests.exceptions.Timeout as e:
            logger.error(f"Request timeout: {e}")
            return jsonify({"error": "Request timed out", "code": "TIMEOUT"}), 504
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response else 500
            error_msg = f"Provider error: {status_code}"
            if status_code == 401:
                error_msg = "Invalid API key"
            elif status_code == 429:
                error_msg = "Rate limit exceeded. Please try again later."
            elif status_code >= 500:
                error_msg = "Provider service unavailable"
            logger.error(f"HTTP error: {status_code} - {e}")
            return jsonify({"error": error_msg, "code": f"HTTP_{status_code}"}), status_code
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            return jsonify({"error": "Failed to communicate with provider", "code": "REQUEST_FAILED"}), 503
        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            return jsonify({"error": "An unexpected error occurred", "code": "INTERNAL_ERROR"}), 500
    return decorated

def extract_tokens(provider, data):
    usage = {}
    if provider == "anthropic":
        usage = {"input_tokens": data.get("usage", {}).get("input_tokens", 0),
                "output_tokens": data.get("usage", {}).get("output_tokens", 0)}
    else:
        usage = {"prompt_tokens": data.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": data.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": data.get("usage", {}).get("total_tokens", 0)}
    if usage:
        usage["total"] = usage.get("input_tokens", 0) + usage.get("output_tokens", 0) or \
                   usage.get("prompt_tokens", 0) + usage.get("completion_tokens", 0)
    return usage

def build_payload(provider, model, messages, stream=False):
    if provider == "anthropic":
        return {"model": model, "messages": messages, "stream": stream, "max_tokens": 4096}
    elif provider == "google":
        return {"contents": [{"role": m["role"], "parts": [{"text": m["content"]}]} for m in messages]}
    else:
        return {"model": model, "messages": messages, "stream": stream}

def transform_response(provider, data):
    if provider == "anthropic":
        content = data.get("content", "")
        usage = data.get("usage", {})
        return {"choices": [{"message": {"content": content}}], "usage": usage}
    elif provider == "google":
        cand = data.get("candidates", [{}])[0]
        text = cand.get("content", {}).get("parts", [{}])[0].get("text", "")
        return {"choices": [{"message": {"content": text}}]}
    return data

@app.route("/api/chat", methods=["POST"])
@handle_errors
def chat():
    data = request.json
    provider = data.get("provider", "openrouter")
    model = data.get("model")
    api_key = data.get("apiKey")
    messages = data.get("messages", [])
    stream = data.get("stream", False)

    if not api_key:
        raise ValueError("Missing API key")
    if not model:
        raise ValueError("Missing model")
    if not messages:
        raise ValueError("Missing messages")

    endpoint = PROVIDER_ENDPOINTS.get(provider)
    if not endpoint:
        raise ValueError(f"Unknown provider: {provider}")

    headers_fn = PROVIDER_HEADERS.get(provider)
    if not headers_fn:
        raise ValueError(f"Unsupported provider: {provider}")

    headers = headers_fn(api_key)
    if provider == "github":
        headers["azure-Deployment-Name"] = model

    payload = build_payload(provider, model, messages, stream)
    logger.info(f"Chat request: provider={provider}, model={model}, messages={len(messages)}")

    resp = requests.post(endpoint, headers=headers, json=payload, stream=stream, timeout=60)
    resp.raise_for_status()
    
    if stream:
        def generate():
            for chunk in resp.iter_content(chunk_size=None):
                yield chunk
        return generate(), 200, {"Content-Type": "text/event-stream"}
    
    result = transform_response(provider, resp.json())
    
    usage = extract_tokens(provider, resp.json())
    if usage:
        result["usage"] = usage
        logger.info(f"Token usage: {usage}")
    
    return jsonify(result)

@app.route("/api/models", methods=["GET"])
@handle_errors
def models():
    provider = request.args.get("provider", "openrouter")
    free = FREE_MODELS.get(provider, [])
    return jsonify({"free": free, "provider": provider})

@app.route("/api/search", methods=["GET"])
@handle_errors
def search():
    query = request.args.get("q", "")
    if not query:
        raise ValueError("Missing search query")
    
    ddgs = DDGS()
    results = list(ddgs.text(query, max_results=10))
    logger.info(f"Search: query={query}, results={len(results)}")
    return jsonify({"results": results, "query": query})

@app.route("/api/execute", methods=["POST"])
@handle_errors
def execute():
    data = request.json
    language = data.get("language", "python")
    code = data.get("code", "")
    version = data.get("version", "*")
    
    if not code:
        raise ValueError("Missing code to execute")

    piston_url = "https://emkc.org/api/v2/piston/execute"
    payload = {"language": language, "version": version, "files": [{"content": code}]}
    
    logger.info(f"Execute: language={language}")
    
    resp = requests.post(piston_url, json=payload, timeout=30)
    resp.raise_for_status()
    return jsonify(resp.json())

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "version": "reborn-1.0.0",
        "providers": list(PROVIDER_ENDPOINTS.keys())
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))