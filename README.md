# Aether - AI Chat PWA

<div align="center">

**Aether** is a mobile-first PWA AI chat assistant with cross-device sync, custom agents, and 11+ LLM providers.

[Features](#features) · [Quick Start](#quick-start) · [Backend Setup](#backend-setup) · [API](#api-endpoints)

</div>

---

## Features

### What Each Feature Does

| Feature | How to Use | What Happens | If Backend Down |
|---------|------------|--------------|-----------------|
| **Send Message** | Type in input, tap Send or Enter | Message goes to selected LLM, response streams in | Falls back to direct API call from browser |
| **Voice Input** | Tap mic button | Browser asks for mic, listens for speech, transcribes | Works offline (Web Speech API) |
| **File Upload** | Tap attach → pick .txt/.md | File content appended to message | Works offline |
| **Web Search** | Type `/search query` | Shows DuckDuckGo results in chat | Shows "Search Failed" error |
| **Code Execution** | Toggle in Settings → send code | Code runs via Piston API, output shown | Shows "Execution unavailable" |
| **Custom Agents** | Agents tab → Create Agent | Agent saved to IndexedDB, appears in dropdown | Works offline |
| **Cross-Device Sync** | Settings → Host/Join | Messages sync via WebSocket | Shows "Not connected" |

### UI Tabs

| Tab | Purpose |
|-----|---------|
| **Chat** | Main conversation interface |
| **Agents** | Create and manage custom AI agents |
| **Settings** | API keys, themes, sync, data management |

### Settings Sections

| Section | Options | What They Do |
|---------|---------|--------------|
| **API Keys** | 12 providers | Store API keys per provider |
| **Models & Settings** | Default model, streaming, auto-execute | Configure LLM behavior |
| **Appearance** | Space Dark / Light / Glass themes | Change UI look |
| **Voice & Input** | Speech-to-text toggle, voice memo | Enable voice features |
| **Cross-Device** | Off / Host / Join | Sync across devices |
| **Data & Storage** | Clear history, export/import | Manage local data |

---

## Quick Start

### Frontend Only (Works Immediately)

```bash
# Open in browser
npx serve .

# Or use any static server
python -m http.server 8080
```

Features that work **without backend**:
- Chat UI (needs API key in browser)
- Voice input (Web Speech API)
- File upload (.txt/.md)
- Custom agents (IndexedDB)
- Themes and appearance
- Local storage

### Backend Required For

| Feature | Why | Fallback |
|---------|-----|----------|
| Web Search | DuckDuckGo API via `/api/search` | "Search Failed" message |
| Code Execution | Piston API via `/api/execute` | Manual copy/paste |
| Cross-Device Sync | Socket.IO WebSocket | Works on same device only |
| Model List | `/api/models` endpoint | Hardcoded fallback list |

---

## Backend Setup

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run Flask server
python api/server.py
# Server runs on http://localhost:5000

# Or with Flask CLI
FLASK_APP=api/server.py flask run --host=0.0.0.0 --port=5000
```

### Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Send chat messages to LLM |
| `/api/search?q=` | GET | Web search via DuckDuckGo |
| `/api/models?provider=` | GET | Get available models |
| `/api/execute` | POST | Execute code in sandbox |
| `/api/health` | GET | Health check |

### WebSocket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join_session` | Client → Server | Join a sync session |
| `leave_session` | Client → Server | Leave sync session |
| `send_sync_message` | Client → Server | Broadcast message |
| `receive_sync_message` | Server → Client | Receive synced message |
| `connected_devices_update` | Server → Client | Device list changed |

### Deploy Backend

**Option 1: Render (Recommended)**
```bash
# Create render.yaml or use Render dashboard
# Runtime: Python 3.11
# Build command: pip install -r requirements.txt
# Start command: python api/server.py
```

**Option 2: Railway**
```bash
# Connect GitHub repo
# Set start command: python api/server.py
```

**Option 3: Fly.io**
```bash
fly launch
fly secrets set OPENROUTER_API_KEY=your-key
fly deploy
```

---

## API Endpoints

### POST /api/chat

```json
{
  "provider": "openrouter",
  "model": "deepseek/deepseek-chat",
  "apiKey": "sk-or-...",
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "stream": true
}
```

Response (streaming):
```
data: {"choices": [{"delta": {"content": "Hi"}}]}
data: [DONE]
```

### GET /api/search?q=query

Response:
```json
{
  "results": [
    {"title": "Result", "url": "https://...", "snippet": "Description"}
  ],
  "query": "query"
}
```

### POST /api/execute

```json
{
  "language": "python",
  "code": "print('Hello')",
  "version": "*"
}
```

Response:
```json
{
  "run": {"stdout": "Hello\n", "stderr": "", "code": 0}
}
```

---

## LLM Providers

### Free Models (No API Key)

| Provider | Models |
|----------|--------|
| **OpenRouter** | deepseek-chat, llama-3.3-70b, qwen3-30b-a3b, gemma-3-27b |
| **Groq** | llama-3.3-70b, mixtral-8x7b, deepseek-r1 |
| **Cerebras** | llama-3.3-70b |
| **Google** | gemini-2.0-flash, gemini-1.5-flash |
| **OpenCode Zen** | big-pickle, MiniMax-M2.5-Free, GLM-4.7-Free |

### Requires API Key

| Provider | Sign Up |
|----------|---------|
| OpenAI | platform.openai.com |
| Anthropic | console.anthropic.com |
| Mistral | mistral.ai |
| Cohere | cohere.com |
| HuggingFace | huggingface.co |
| Cloudflare | cloudflare.com/ai |
| GitHub | github.com/features/copilot |

---

## PWA Installation

| Platform | How to Install |
|----------|----------------|
| **iOS** | Safari → Share → Add to Home Screen |
| **Android** | Chrome → Menu → Install App |
| **Desktop** | Chrome → Menu → Install Aether |

PWA provides:
- Offline capability (cached pages)
- Home screen icon
- Full-screen experience
- Push notifications ready

---

## Project Structure

```
aether-pwa/
├── index.html          # Main app
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── js/
│   ├── app.js        # Main initialization
│   ├── chat.js       # Chat UI logic
│   ├── api.js        # LLM API calls
│   ├── store.js      # IndexedDB storage
│   ├── search.js     # Web search
│   ├── sync.js       # Cross-device WebSocket
│   └── settings.js   # Settings UI
├── api/
│   └── server.py     # Flask backend
├── styles/
│   ├── main.css      # Core styles
│   ├── theme.css     # Theme variants
│   └── anim.css      # Animations
└── icons/            # PWA icons
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Speech recognition not supported" | Use Chrome/Edge (desktop) or Safari (iOS) |
| "Search failed" | Backend not running or /api/search unavailable |
| "Connection timeout" for sync | Check both devices on same network |
| PWA won't install | Ensure HTTPS or localhost, check manifest.json |
| API key error | Verify key in Settings, check provider status |

---

## License

MIT License - See [LICENSE.md](LICENSE.md)