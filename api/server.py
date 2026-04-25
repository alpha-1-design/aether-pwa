import os
import json
import logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
from duckduckgo_search import DDGS

# Import SocketIO components
from flask_socketio import SocketIO, emit, join_room, leave_room
from engineio.async_drivers import threading # Often needed for SocketIO run

app = Flask(__name__)
# CORS is already configured for Flask app
CORS(app)

# Initialize Flask-SocketIO. It needs to wrap the Flask app.
# 'cors_allowed_origins' is important for development, adjust for production.
# For now, allow all origins for simplicity, but this should be restricted in production.
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading') 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Existing Provider Configurations (LLMs, Models, Headers) ---
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

# --- Error Handling Decorator ---
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

# --- Helper Functions for LLM Calls ---
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
        usage["total"] = usage.get("input_tokens", 0) + usage.get("output_tokens", 0) or 
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

# --- Flask Routes ---
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

# --- File Upload Endpoint (Server-side save - needs re-evaluation for Vercel) ---
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'} 

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and 
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/api/upload", methods=["POST"])
@handle_errors
def upload_file():
    if 'files' not in request.files:
        raise ValueError("No file part in the request")
    
    files = request.files.getlist('files') 
    
    if not files or all(f.filename == '' for f in files):
        raise ValueError("No selected files")

    uploaded_filenames = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = file.filename
            filename = os.path.basename(filename) # Sanitize filename
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            try:
                file.save(filepath)
                uploaded_filenames.append(filename)
                logger.info(f"File uploaded successfully: {filename} to {filepath}")
            except Exception as e:
                logger.error(f"Error saving file {filename}: {e}")
                raise ValueError(f"Could not save file {filename}")
        else:
            logger.warning(f"File type not allowed: {file.filename}")

    if not uploaded_filenames:
        raise ValueError("No valid files were uploaded.")

    return jsonify({"message": "Files uploaded successfully", "filenames": uploaded_filenames}), 200

# --- WebSocket Setup ---
# Initialize SocketIO with the Flask app
# async_mode='threading' is suitable for development with Flask's built-in server.
# For production, consider a production-ready ASGI server like uvicorn/gunicorn with workers.
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading') 

# Define SocketIO event handlers
@socketio.on('connect')
def handle_connect():
    """Handles client connection."""
    print(f"Client connected: {request.sid}")
    emit('message', {'data': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handles client disconnection."""
    print(f"Client disconnected: {request.sid}")

@socketio.on('join_session')
def on_join_session(data):
    """Handles a client joining a specific session room."""
    session_id = data.get('session_id')
    is_host = data.get('is_host', False) # New: indicate if client is host
    if session_id:
        join_room(session_id)
        print(f"Client {request.sid} joined session: {session_id} (Host: {is_host})")
        # Emit a message to the room that a new client joined
        emit('message', {'data': f'Client {request.sid} joined session {session_id}'}, room=session_id)
        # Update connected device list for all in room
        emit('connected_devices_update', {'devices': [sid for sid in socketio.sockets.get(session_id, {}).keys()]}, room=session_id)
    else:
        print("Join session failed: Missing session_id")
        emit('error', {'message': 'Missing session_id'})

@socketio.on('leave_session')
def on_leave_session(data):
    """Handles a client leaving a session room."""
    session_id = data.get('session_id')
    if session_id:
        leave_room(session_id)
        print(f"Client {request.sid} left session: {session_id}")
        emit('message', {'data': f'Client {request.sid} left session {session_id}'}, room=session_id)
        # Update connected device list for all in room
        emit('connected_devices_update', {'devices': [sid for sid in socketio.sockets.get(session_id, {}).keys()]}, room=session_id)
    else:
        print("Leave session failed: Missing session_id")
        emit('error', {'message': 'Missing session_id'})

@socketio.on('send_sync_message')
def on_send_sync_message(data):
    """Broadcasts a message to all clients in a session."""
    session_id = data.get('session_id')
    message_data = data.get('message')
    if session_id and message_data:
        print(f"Broadcasting message to session {session_id}: {message_data}")
        # Only broadcast to others in the room, not the sender
        emit('receive_sync_message', {'message': message_data}, room=session_id, skip_sid=request.sid) 
    else:
        print("Send sync message failed: Missing session_id or message data")
        emit('error', {'message': 'Missing session_id or message data'})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting server on port {port} with WebSocket support...")
    socketio.run(app, host="0.0.0.0", port=port)
