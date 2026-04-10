import os
import json
import time
import logging
from datetime import datetime, timedelta
from functools import wraps
from collections import defaultdict

from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS

app = Flask(__name__)

FRONTEND_URL = os.getenv('FRONTEND_URL', '')
if FRONTEND_URL:
    CORS(app, origins=[FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'])
else:
    CORS(app, resources={r"/api/*": {"origins": "*"}})

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

logger.info(f"API Keys loaded: openrouter={'set' if API_KEYS['openrouter'] else 'NOT SET'}, anthropic={'set' if API_KEYS['anthropic'] else 'NOT SET'}, openai={'set' if API_KEYS['openai'] else 'NOT SET'}")

AVAILABLE_MODELS = {
    "openrouter": [
        {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet", "context_length": 200000, "capabilities": ["chat", "thinking", "vision"]},
        {"id": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "context_length": 200000, "capabilities": ["chat", "thinking", "vision"]},
        {"id": "openai/gpt-4o", "name": "GPT-4o", "context_length": 128000, "capabilities": ["chat", "vision"]},
        {"id": "openai/gpt-4-turbo", "name": "GPT-4 Turbo", "context_length": 128000, "capabilities": ["chat", "vision"]},
        {"id": "google/gemini-pro-1.5", "name": "Gemini Pro 1.5", "context_length": 1000000, "capabilities": ["chat", "vision"]},
        {"id": "meta-llama/llama-3-70b-instruct", "name": "Llama 3 70B", "context_length": 8192, "capabilities": ["chat"]},
        {"id": "google/gemini-2.0-flash", "name": "Gemini 2.0 Flash", "context_length": 1000000, "capabilities": ["chat", "vision"]},
        {"id": "deepseek/deepseek-chat", "name": "DeepSeek V3", "context_length": 64000, "capabilities": ["chat"]},
        {"id": "mistralai/mistral-7b-instruct", "name": "Mistral 7B", "context_length": 8192, "capabilities": ["chat"]},
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
    model = data.get("model", "deepseek/deepseek-chat")
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


# ==================== MCP SERVER ENDPOINTS ====================
# Model Context Protocol (MCP) compatible endpoints for development integrations

MCP_TOOLS = [
    {
        "name": "read_file",
        "description": "Read contents of a file from the filesystem",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the file to read"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write content to a file on the filesystem",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the file to write"},
                "content": {"type": "string", "description": "Content to write to the file"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "list_directory",
        "description": "List contents of a directory",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the directory to list"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "execute_command",
        "description": "Execute a shell command and return the output",
        "inputSchema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "The shell command to execute"},
                "cwd": {"type": "string", "description": "Working directory for the command"}
            },
            "required": ["command"]
        }
    },
    {
        "name": "search_files",
        "description": "Search for files matching a pattern",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Glob pattern to match files"},
                "path": {"type": "string", "description": "Directory to search in"}
            },
            "required": ["pattern"]
        }
    },
    {
        "name": "get_ai_response",
        "description": "Get an AI response for a given prompt",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "The prompt to send to the AI"},
                "model": {"type": "string", "description": "Model to use (defaults to configured default)"},
                "provider": {"type": "string", "description": "Provider to use (openrouter, anthropic, openai, google)"}
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "web_search",
        "description": "Search the web for information",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "num_results": {"type": "number", "description": "Number of results to return"}
            },
            "required": ["query"]
        }
    }
]


@app.route("/api/mcp/tools", methods=["GET"])
def mcp_list_tools():
    """List all available MCP tools"""
    return jsonify({
        "tools": MCP_TOOLS,
        "version": "1.0.0",
        "name": "Aether MCP Server",
        "description": "Development tools integration for Aether AI"
    })


@app.route("/api/mcp/call", methods=["POST"])
@rate_limit
@log_request
def mcp_call_tool():
    """Call an MCP tool with arguments"""
    data = request.get_json()
    
    if not data or "tool" not in data or "arguments" not in data:
        return jsonify({"error": "Missing 'tool' or 'arguments' in request body"}), 400
    
    tool_name = data["tool"]
    args = data["arguments"]
    
    # Find the tool
    tool = next((t for t in MCP_TOOLS if t["name"] == tool_name), None)
    if not tool:
        return jsonify({"error": f"Unknown tool: {tool_name}"}), 400
    
    try:
        if tool_name == "read_file":
            import pathlib
            file_path = os.path.join(os.getcwd(), args.get("path", ""))
            p = pathlib.Path(file_path)
            if not p.exists():
                return jsonify({"error": f"File not found: {args['path']}"}), 404
            return jsonify({
                "success": True,
                "content": p.read_text()[:50000]  # Limit to 50k chars
            })
        
        elif tool_name == "write_file":
            import pathlib
            file_path = os.path.join(os.getcwd(), args.get("path", ""))
            p = pathlib.Path(file_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(args.get("content", ""))
            return jsonify({"success": True, "path": args["path"]})
        
        elif tool_name == "list_directory":
            import pathlib
            dir_path = os.path.join(os.getcwd(), args.get("path", "."))
            p = pathlib.Path(dir_path)
            if not p.exists():
                return jsonify({"error": f"Directory not found: {args['path']}"}), 404
            items = [{"name": item.name, "type": "dir" if item.is_dir() else "file"} 
                     for item in p.iterdir()][:100]  # Limit to 100 items
            return jsonify({"success": True, "items": items})
        
        elif tool_name == "execute_command":
            import subprocess
            result = subprocess.run(
                args["command"],
                shell=True,
                cwd=args.get("cwd", os.getcwd()),
                capture_output=True,
                text=True,
                timeout=30
            )
            return jsonify({
                "success": result.returncode == 0,
                "stdout": result.stdout[:10000],
                "stderr": result.stderr[:10000],
                "returncode": result.returncode
            })
        
        elif tool_name == "search_files":
            import pathlib
            import fnmatch
            base_path = os.path.join(os.getcwd(), args.get("path", "."))
            pattern = args.get("pattern", "*")
            matches = []
            for p in pathlib.Path(base_path).rglob(pattern):
                if len(matches) >= 100:
                    break
                matches.append(str(p.relative_to(base_path)))
            return jsonify({"success": True, "matches": matches})
        
        elif tool_name == "get_ai_response":
            # Use the chat endpoint
            from flask import make_response
            messages = [{"role": "user", "content": args.get("prompt", "")}]
            response = chat()
            return response
        
        elif tool_name == "web_search":
            result = search()
            return result
        
        return jsonify({"error": f"Tool {tool_name} not implemented"}), 500
    
    except Exception as e:
        logger.error(f"MCP tool error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/fetch", methods=["POST"])
def api_fetch():
    """Fetch external data from URLs for AI processing"""
    try:
        data = request.get_json()
        url = data.get('url', '')
        
        if not url:
            return jsonify({"error": "URL required"}), 400
        
        import urllib.request
        import json
        
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; AetherAI/1.0)',
                'Accept': 'application/json, text/plain, */*'
            }
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read()
            try:
                json_data = json.loads(content)
                return jsonify({"data": json_data})
            except:
                return jsonify({"data": content.decode('utf-8', errors='ignore')})
                
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/mcp/manifest", methods=["GET"])
def mcp_manifest():
    """Return MCP server manifest for client discovery"""
    return jsonify({
        "schemaVersion": "1.0.0",
        "name": "Aether AI",
        "version": "1.0.0",
        "description": "Universal AI assistant with development tool integrations",
        "capabilities": {
            "tools": True,
            "resources": True,
            "prompts": True
        },
        "tools": MCP_TOOLS,
        "baseUrl": f"{request.host_url}api/mcp"
    })


@app.route("/api/live", methods=["POST"])
@rate_limit
@log_request
def live():
    """Streaming chat with adaptive thinking and agentic capabilities"""
    data = request.get_json()
    
    if not data or "messages" not in data:
        return jsonify({"error": "Missing 'messages' in request body"}), 400
    
    messages = data["messages"]
    provider = data.get("provider", "openrouter")
    model = data.get("model", "deepseek/deepseek-chat")
    effort = data.get("effort", "high")  # quick, deep, autonomous
    max_tokens = data.get("max_tokens", 4096)
    temperature = data.get("temperature", 0.7)
    
    if provider not in API_KEYS:
        return jsonify({"error": f"Unknown provider: {provider}"}), 400
    
    if not API_KEYS[provider]:
        return jsonify({"error": "API key not configured"}), 400
    
    def generate():
        try:
            if provider == "openrouter":
                for chunk in _openrouter_stream(messages, model, effort, temperature, max_tokens):
                    yield f"data: {json.dumps(chunk)}\n\n"
            elif provider == "anthropic":
                for chunk in _anthropic_stream(messages, model, effort, temperature, max_tokens):
                    yield f"data: {json.dumps(chunk)}\n\n"
            else:
                yield f"data: {json.dumps({'error': 'Streaming not supported for this provider'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: {\"done\": true}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')


def _openrouter_stream(messages, model, effort, temperature, max_tokens):
    import requests
    
    thinking_config = _get_thinking_config(effort)
    
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
    
    if thinking_config and "claude" in model.lower():
        payload["thinking"] = thinking_config
    
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        stream=True,
        timeout=120
    )
    
    for line in response.iter_lines():
        if line:
            data = line.decode('utf-8')
            if data.startswith('data: '):
                try:
                    chunk = json.loads(data[6:])
                    if 'choices' in chunk and chunk['choices']:
                        delta = chunk['choices'][0].get('delta', {})
                        yield {
                            "content": delta.get('content', ''),
                            "thinking": delta.get('thinking'),
                        }
                except:
                    pass


def _anthropic_stream(messages, model, effort, temperature, max_tokens):
    import anthropic
    
    thinking_config = _get_thinking_config(effort)
    
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
    if thinking_config:
        extra_kwargs["thinking"] = thinking_config
    
    extra_kwargs["stream"] = True
    
    with client.messages.stream(
        model=model,
        system=system,
        messages=anthropic_messages,
        temperature=temperature,
        max_tokens=max_tokens,
        **extra_kwargs
    ) as stream:
        for chunk in stream:
            if chunk.type == "content_block_delta":
                yield {"content": chunk.delta.text}
            elif chunk.type == "thinking_delta":
                yield {"thinking": chunk.delta.thinking}


def _get_thinking_config(effort):
    """Get thinking config based on effort level"""
    configs = {
        "quick": None,
        "deep": {"type": "enabled", "budget_tokens": 8000},
        "autonomous": {"type": "enabled", "budget_tokens": 15000},
    }
    return configs.get(effort)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
