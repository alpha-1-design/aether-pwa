import os
import time
import logging
from datetime import datetime, timedelta
from functools import wraps
from collections import defaultdict

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(path):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

rate_limit_storage = defaultdict(list)
RATE_LIMIT = 60
RATE_WINDOW = 60

API_KEYS = {
    "openrouter": os.getenv("OPENROUTER_API_KEY"),
    "anthropic": os.getenv("ANTHROPIC_API_KEY"),
    "openai": os.getenv("OPENAI_API_KEY"),
    "google": os.getenv("GOOGLE_API_KEY"),
    "tavily": os.getenv("TAVILY_API_KEY"),
}

AVAILABLE_MODELS = {
    "openrouter": [
        {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet", "context_length": 200000, "capabilities": ["chat", "thinking", "vision"]},
        {"id": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "context_length": 200000, "capabilities": ["chat", "thinking", "vision"]},
        {"id": "openai/gpt-4o", "name": "GPT-4o", "context_length": 128000, "capabilities": ["chat", "vision"]},
        {"id": "openai/gpt-4-turbo", "name": "GPT-4 Turbo", "context_length": 128000, "capabilities": ["chat", "vision"]},
        {"id": "google/gemini-pro-1.5", "name": "Gemini Pro 1.5", "context_length": 1000000, "capabilities": ["chat", "vision"]},
        {"id": "meta-llama/llama-3-70b-instruct", "name": "Llama 3 70B", "context_length": 8192, "capabilities": ["chat"]},
    ],
    "anthropic": [
        {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "context_length": 200000, "capabilities": ["chat", "thinking", "vision"]},
        {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "context_length": 200000, "capabilities": ["chat", "thinking", "vision"]},
        {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet", "context_length": 200000, "capabilities": ["chat", "vision"]},
    ],
    "openai": [
        {"id": "gpt-4o", "name": "GPT-4o", "context_length": 128000, "capabilities": ["chat", "vision"]},
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "context_length": 128000, "capabilities": ["chat", "vision"]},
        {"id": "gpt-4", "name": "GPT-4", "context_length": 8192, "capabilities": ["chat"]},
        {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "context_length": 16385, "capabilities": ["chat"]},
    ],
    "google": [
        {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "context_length": 1000000, "capabilities": ["chat", "vision"]},
        {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "context_length": 1000000, "capabilities": ["chat", "vision"]},
        {"id": "gemini-pro", "name": "Gemini Pro", "context_length": 30720, "capabilities": ["chat", "vision"]},
    ],
}


def rate_limit(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        client_ip = request.remote_addr or "unknown"
        now = datetime.now()
        window_start = now - timedelta(seconds=RATE_WINDOW)
        
        rate_limit_storage[client_ip] = [
            t for t in rate_limit_storage[client_ip] if t > window_start
        ]
        
        if len(rate_limit_storage[client_ip]) >= RATE_LIMIT:
            return jsonify({"error": "Rate limit exceeded. Max 60 requests/minute."}), 429
        
        rate_limit_storage[client_ip].append(now)
        return f(*args, **kwargs)
    return decorated


def log_request(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        start_time = time.time()
        logger.info(f"[{datetime.now().isoformat()}] {request.method} {request.path} from {request.remote_addr}")
        result = f(*args, **kwargs)
        duration = time.time() - start_time
        logger.info(f"[{datetime.now().isoformat()}] Completed in {duration:.3f}s")
        return result
    return decorated


@app.route("/api/chat", methods=["POST"])
@rate_limit
@log_request
def chat():
    data = request.get_json()
    
    if not data or "messages" not in data:
        return jsonify({"error": "Missing 'messages' in request body"}), 400
    
    messages = data["messages"]
    provider = data.get("provider", "openrouter")
    model = data.get("model", "anthropic/claude-3.5-sonnet")
    thinking = data.get("thinking", False)
    temperature = data.get("temperature", 0.7)
    max_tokens = data.get("max_tokens", 4096)
    
    if provider not in API_KEYS:
        return jsonify({"error": f"Unknown provider: {provider}"}), 400
    
    if not API_KEYS[provider]:
        return _demo_response(messages, model, thinking)
    
    try:
        if provider == "openrouter":
            result = _openrouter_chat(messages, model, thinking, temperature, max_tokens)
        elif provider == "anthropic":
            result = _anthropic_chat(messages, model, thinking, temperature, max_tokens)
        elif provider == "openai":
            result = _openai_chat(messages, model, temperature, max_tokens)
        elif provider == "google":
            result = _google_chat(messages, model, temperature, max_tokens)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({"error": str(e)}), 500


def _demo_response(messages, model, thinking):
    last_message = messages[-1]["content"] if messages else ""
    model_name = model.split("/")[-1] if "/" in model else model
    
    demo_responses = {
        "default": f"I'm running in demo mode without API keys configured. Once you add your API key in Settings, I'll be able to provide real AI responses using {model_name}.\n\nTo get started:\n1. Click the Settings icon in the header\n2. Enter your API key for your preferred provider\n3. Start chatting!\n\n**Available Providers:**\n- **OpenRouter** - Access multiple models (recommended)\n- **Anthropic** - Claude models\n- **OpenAI** - GPT models\n- **Google** - Gemini models",
        
        "code": f"```python\n# Demo code response\ndef hello_world():\n    print(\"Hello from {model_name}!\")\n    return {{\n        'status': 'success',\n        'model': '{model_name}',\n        'message': 'Configure API key for real responses'\n    }}\n\nhello_world()\n```\n\n*Configure an API key to get real code generation.*",
        
        "hello": f"Hello! 👋 I'm Aether AI, running in demo mode. I'm ready to help you with:\n\n- Writing and debugging code\n- Answering questions\n- Creative writing\n- Data analysis\n- Research and more!\n\n**To unlock full capabilities**, add your API key in Settings. I support:\n- **Claude** (Anthropic)\n- **GPT-4** (OpenAI)\n- **Gemini** (Google)\n- **100+ models** via OpenRouter",
    }
    
    response_type = "default"
    lower_msg = last_message.lower()
    if any(word in lower_msg for word in ["code", "python", "javascript", "function", "def ", "class "]):
        response_type = "code"
    elif any(word in lower_msg for word in ["hello", "hi", "hey", "greetings"]):
        response_type = "hello"
    
    result = {
        "content": demo_responses[response_type],
        "usage": {"prompt_tokens": len(last_message), "completion_tokens": len(demo_responses[response_type]), "total_tokens": len(last_message) + len(demo_responses[response_type])},
        "demo": True,
        "model": model_name
    }
    
    if thinking:
        result["thinking"] = "Demo mode thinking: The user is exploring the app. Providing helpful guidance about API key setup."
    
    return jsonify(result)


def _openrouter_chat(messages, model, thinking, temperature, max_tokens):
    import requests
    
    headers = {
        "Authorization": f"Bearer {API_KEYS['openrouter']}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aether-pwa.app",
        "X-Title": "Aether AI PWA",
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    
    if thinking and "claude" in model.lower():
        payload["thinking"] = {"type": "enabled", "budget_tokens": 15000}
    
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=120
    )
    
    if response.status_code != 200:
        error_data = response.json() if response.content else {}
        raise Exception(error_data.get("error", {}).get("message", f"OpenRouter error: {response.status_code}"))
    
    data = response.json()
    choice = data["choices"][0]
    
    result = {
        "content": choice["message"]["content"],
        "usage": data.get("usage", {}),
    }
    
    if "thinking" in choice["message"]:
        result["thinking"] = choice["message"]["thinking"]
    
    return result


def _anthropic_chat(messages, model, thinking, temperature, max_tokens):
    import anthropic
    
    client = anthropic.Anthropic(api_key=API_KEYS["anthropic"])
    
    system = ""
    anthropic_messages = []
    
    for msg in messages:
        if msg["role"] == "system":
            system = msg["content"]
        else:
            anthropic_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    
    extra_kwargs = {}
    if thinking:
        extra_kwargs["thinking"] = {
            "type": "enabled",
            "budget_tokens": 15000
        }
    
    response = client.messages.create(
        model=model,
        system=system,
        messages=anthropic_messages,
        temperature=temperature,
        max_tokens=max_tokens,
        **extra_kwargs
    )
    
    thinking_content = None
    text_content = None
    
    for block in response.content:
        if block.type == "thinking":
            thinking_content = block.thinking
        elif block.type == "text":
            text_content = block.text
    
    result = {
        "content": text_content or "",
        "usage": {
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        }
    }
    
    if thinking_content:
        result["thinking"] = thinking_content
    
    return result


def _openai_chat(messages, model, temperature, max_tokens):
    import openai
    
    client = openai.OpenAI(api_key=API_KEYS["openai"])
    
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    
    return {
        "content": response.choices[0].message.content,
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }
    }


def _google_chat(messages, model, temperature, max_tokens):
    import google.generativeai as genai
    
    genai.configure(api_key=API_KEYS["google"])
    model_obj = genai.GenerativeModel(model)
    
    combined_content = "\n".join([
        f"{msg['role']}: {msg['content']}" 
        for msg in messages
    ])
    
    response = model_obj.generate_content(
        combined_content,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
    )
    
    return {
        "content": response.text,
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }
    }


@app.route("/api/search", methods=["POST"])
@rate_limit
@log_request
def search():
    data = request.get_json()
    
    if not data or "query" not in data:
        return jsonify({"error": "Missing 'query' in request body"}), 400
    
    query = data["query"]
    num_results = data.get("num_results", 5)
    
    try:
        if API_KEYS.get("tavily"):
            return _tavily_search(query, num_results)
        else:
            return _duckduckgo_search(query, num_results)
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({"error": str(e)}), 500


def _tavily_search(query, num_results):
    import requests
    
    headers = {"Authorization": f"Bearer {API_KEYS['tavily']}"}
    payload = {"query": query, "max_results": num_results}
    
    response = requests.post(
        "https://api.tavily.com/search",
        headers=headers,
        json=payload,
        timeout=30
    )
    
    if response.status_code != 200:
        raise Exception(f"Tavily API error: {response.status_code}")
    
    data = response.json()
    
    results = [
        {"title": r["title"], "url": r["url"], "snippet": r["content"]}
        for r in data.get("results", [])
    ]
    
    return jsonify({"results": results, "answer": data.get("answer")})


def _duckduckgo_search(query, num_results):
    from duckduckgo_search import DDGS
    
    results = []
    with DDGS() as ddgs:
        for i, r in enumerate(ddgs.text(query, max_results=num_results)):
            if i >= num_results:
                break
            results.append({
                "title": r["title"],
                "url": r["href"],
                "snippet": r["body"]
            })
    
    return jsonify({"results": results, "answer": None})


@app.route("/api/execute", methods=["POST"])
@rate_limit
@log_request
def execute():
    data = request.get_json()
    
    if not data or "code" not in data:
        return jsonify({"error": "Missing 'code' in request body"}), 400
    
    code = data["code"]
    language = data.get("language", "python")
    
    if language != "python":
        return jsonify({"error": "Only Python execution is supported"}), 400
    
    start_time = time.time()
    output = ""
    error = ""
    
    try:
        import io
        import sys
        
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = io.StringIO()
        sys.stderr = io.StringIO()
        
        try:
            exec_globals = {"__name__": "__main__"}
            exec(code, exec_globals)
            output = sys.stdout.getvalue()
            error = sys.stderr.getvalue()
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
        
    except Exception as e:
        error = str(e)
    
    execution_time = time.time() - start_time
    
    return jsonify({
        "output": output,
        "error": error,
        "execution_time": execution_time
    })


@app.route("/api/models", methods=["GET"])
@rate_limit
@log_request
def models():
    all_models = []
    
    for provider, model_list in AVAILABLE_MODELS.items():
        if API_KEYS.get(provider):
            for model in model_list:
                model_copy = model.copy()
                model_copy["provider"] = provider
                all_models.append(model_copy)
        else:
            for model in model_list[:1]:
                model_copy = model.copy()
                model_copy["provider"] = provider
                model_copy["available"] = False
                all_models.append(model_copy)
    
    return jsonify({"models": all_models})


@app.route("/api/embed", methods=["POST"])
@rate_limit
@log_request
def embed():
    data = request.get_json()
    
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' in request body"}), 400
    
    text = data["text"]
    model = data.get("model", "text-embedding-3-small")
    
    try:
        if API_KEYS.get("openai"):
            import openai
            client = openai.OpenAI(api_key=API_KEYS["openai"])
            response = client.embeddings.create(input=text, model=model)
            return jsonify({"embedding": response.data[0].embedding})
        else:
            raise Exception("OpenAI API key not configured for embeddings")
    
    except Exception as e:
        logger.error(f"Embed error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
