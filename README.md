# Aether AI - Unified AI Assistant Platform

<div align="center">

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-6b00ff?style=flat&logo=pwa)](https://web.dev/explore/progressive-web-apps)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![Version](https://img.shields.io/badge/Version-1.0.0-success)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/Platform-Web|iOS|Android|Desktop-purple)](https://vercel.com)

A Gemini-style AI chat application with PWA support, 11+ LLM providers, custom agents, cross-device sync, and native app feel.

</div>

---

## Features

### Core
- **PWA Installable** - Feels like a native app on any device
- **11+ LLM Providers** - OpenRouter, Groq, Cerebras, Google, OpenCode, HuggingFace, Cohere, GitHub, Cloudflare, Mistral, OpenAI, Anthropic
- **Custom Agents** - Create AI agents with personalities saved to IndexedDB
- **Code Execution** - Run code in 20+ languages via Piston API
- **Web Search** - DuckDuckGo search (auto + manual)
- **File Upload** - Images, PDFs supported
- **Voice Input** - Web Speech API + voice memo recording
- **Cross-Device Sync** - Host/Join via WebSocket on local network

### UI/UX
- **Space Dark Theme** (default), Light, Glass themes
- **Glassmorphism Design** - Professional SVG icons
- **Atom Logo** - Rotating rings animation when AI is thinking
- **3 Main Tabs** - Chat, Agents, Settings

### Settings Sections
1. **API Keys** - Per-provider keys
2. **Models** - Default model, streaming, auto-execute
3. **Appearance** - Theme, font size
4. **Voice & Input** - Speech-to-text, voice memo
5. **Cross-Device** - Host/Join modes
6. **Data & Storage** - Clear history, export/import
7. **About** - Version info

---

## Quick Start

### Prerequisites
- Node.js 18+ (for local development)
- Python 3.9+ (for backend)
- API keys from your preferred providers

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/aether-pwa.git
cd aether-pwa

# Install Python dependencies
pip install -r requirements.txt

# Or create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Development

```bash
# Run Flask backend (development)
python api/server.py

# Or with Flask CLI
FLASK_APP=api/server.py flask run --host=0.0.0.0 --port=5000
```

### Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

The frontend deploys as static files. For the backend:
- Use Vercel Serverless Functions (Python runtime)
- Or deploy separately to Render/Replit

---

## Configuration

### Vercel Configuration

```json
{
  "version": 2,
  "buildCommand": null,
  "outputDirectory": "public",
  "framework": null,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api/(.*)", "dest": "/api/server.py" }
  ]
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `FLASK_ENV` | Environment | development |
| `OPENROUTER_API_KEY` | OpenRouter key | - |
| `ANTHROPIC_API_KEY` | Anthropic key | - |

---

## API Endpoints

### POST /api/chat
Chat with LLM providers.

```bash
curl -X POST https://yourdomain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openrouter",
    "model": "deepseek/deepseek-chat",
    "apiKey": "your-api-key",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### GET /api/search?q=query
Web search via DuckDuckGo.

```bash
curl "https://yourdomain.com/api/search?q=javascript+tutorial"
```

### GET /api/models?provider=openrouter
Get available models for a provider.

```bash
curl "https://yourdomain.com/api/models?provider=openrouter"
```

### GET /api/health
Health check endpoint.

```bash
curl "https://yourdomain.com/api/health"
```

---

## Project Structure

```
aether-pwa/
├── public/                 # Static frontend files
│   ├── index.html         # Main HTML
│   ├── manifest.json     # PWA manifest
│   ├── sw.js            # Service worker
│   ├── js/              # JavaScript modules
│   │   ├── app.js       # Main app
│   │   ├── store.js     # IndexedDB wrapper
│   │   ├── api.js      # LLM API integration
│   │   ├── chat.js     # Chat UI
│   │   ├── agents.js   # Custom agents
│   │   ├── settings.js # Settings UI
│   │   └── sync.js    # WebSocket sync
│   └── styles/          # CSS files
│       ├── main.css     # Core styles
│       ├── theme.css   # Theme system
│       └── anim.css    # Animations
├── api/                 # Flask backend
│   └── server.py       # API server
├── vercel.json         # Vercel config
├── requirements.txt   # Python deps
├── README.md           # This file
├── CONTRIBUTING.md     # Contribution guide
├── PRIVACY.md          # Privacy policy
├── LICENSE.md          # MIT License
├── CHANGELOG.md       # Version history
└── AUTHORS.md          # Contributors
```

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 14+ | Full |
| Edge | 90+ | Full |

### PWA Support
- iOS Safari 16.4+ (Add to Home Screen)
- Chrome for Android (Install App)
- Desktop Chrome/Edge (Install App)

---

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom properties, animations
- **Vanilla JavaScript** - ES6+ modules
- **IndexedDB** - Local storage
- **Service Worker** - PWA caching
- **WebSocket** - Real-time sync

### Backend
- **Flask** - Python web framework
- **Flask-CORS** - CORS handling
- **Requests** - HTTP client
- **DuckDuckGo Search** - Web search

### External APIs
- **Piston API** - Code execution
- **OpenRouter** - LLM gateway
- **Groq** - Fast inference
- **Cerebras** - Ultra-fast inference

---

## Free Models

### OpenRouter
- DeepSeek Chat (128K ctx)
- Llama 3 70B
- Qwen 2.5 72B
- Gemini 2.0 Flash

### Groq
- Llama 3.3 70B
- Mixtral 8x7B
- DeepSeek R1

### Cerebras
- Llama 3.3 70B (fastest)

### OpenCode Zen
- Big Pickle
- MiniMax M2.5 Free
- GLM 4.7 Free
- Kimi K2.5 Free

### Google
- Gemini 1.5 Flash
- Gemini 2.0 Flash

---

## Troubleshooting

### Service Worker Not Registering
- Ensure you're serving over HTTPS (or localhost)
- Check browser console for errors

### API Errors
- Verify your API key is correct
- Check the provider status page
- Ensure you have quota remaining

### Cross-Device Sync Not Working
- Both devices must be on the same network
- Check firewall settings
- Use local IP instead of hostname

### PWA Not Installing
- iOS: Use Safari "Share" > "Add to Home Screen"
- Android: Use Chrome "Install App" menu
- Desktop: Chrome menu > "Install Aether"

---

## License

This project is licensed under the [MIT License](LICENSE.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

## Security

See [SECURITY.md](SECURITY.md) for security policy.

---

## Credits

See [AUTHORS.md](AUTHORS.md) for the development team.

---

## Support

- **Issues**: https://github.com/yourusername/aether-pwa/issues
- **Discussions**: https://github.com/yourusername/aether-pwa/discussions
- **Documentation**: https://aether-pwa.docs.example.com

---

<div align="center">

Built with passion for AI assistants

[Website](https://aether.example.com) · [Documentation](https://aether-pwa.docs.example.com) · [Report Bug](https://github.com/yourusername/aether-pwa/issues)

</div>