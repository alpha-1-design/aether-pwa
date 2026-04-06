# Aether AI - Project Aether

![Aether AI](https://img.shields.io/badge/Aether-AI-6b00ff?style=for-the-badge&logo=robot&logoColor=00ffff)
![Python](https://img.shields.io/badge/Python-3.13-3776ab?style=flat-square&logo=python&logoColor=ffd43b)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=flat-square&logo=flask&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-4fc3f7?style=flat-square&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

> **The ultimate unified AI platform** - Combining the best of Claude, GPT-4, Gemini, Perplexity, and 100+ AI models into one cosmic, space-themed PWA.

## Features

### Core AI (20+ Features)
- Multi-model simultaneous responses
- Conversation branching & forking
- AI model comparison mode
- Prompt versioning with rollback
- Dynamic persona switching
- Context injection from files
- Batch AI processing
- Scheduled AI tasks
- Webhook integrations
- Custom model fine-tuning interface
- AI response quality scoring
- Automatic fact-checking
- Citation extraction & source attribution
- Multi-turn reasoning chains
- AI confidence indicators
- Token budget tracking
- Cost estimation per conversation

### Code Tools (30+ Features)
- Real-time collaborative coding
- Multi-file project generation
- Git integration
- Code review & bug detection
- Security vulnerability scanning
- Performance analysis
- Code explainer
- Code translator
- Test case generator
- Documentation generator
- API client generator
- Database schema designer
- Regex builder
- SQL query optimizer
- Architecture diagram generator
- DevOps script generator
- CI/CD pipeline generator
- Docker & Kubernetes generators
- Error message decoder
- Code complexity analyzer

### Research & Data (30+ Features)
- Research paper summarizer
- Academic citation formatter
- Data visualization generator
- Dashboard builder
- Report generator
- Survey question generator
- Statistical test selector
- A/B test analyzer
- Competitive analysis
- SWOT analysis
- Risk assessment generator
- Compliance checklist
- Executive summary generator
- Decision matrix builder

### Writing & Creative (60+ Features)
- Blog post generator
- SEO optimizer
- Content rephraser
- Social media post generator
- Video script writer
- Presentation creator
- Story & character builder
- Poetry & lyrics generator
- Game narrative designer
- RPG quest creator
- Recipe & cocktail creator
- Travel itinerary builder
- Brand name & slogan generator

### Productivity (30+ Features)
- Meeting scheduler
- Time tracker & Pomodoro
- Goal & habit tracker
- Mind map generator
- Sprint planner
- OKR tracker
- Learning path generator

### Education (30+ Features)
- Flashcard generator
- Quiz builder
- Study guide creator
- Concept explainer
- Practice problem generator
- Math solver with steps
- Language learning assistant

### Advanced AI Modes (10+)
- Chain-of-thought visualization
- Tool use planner
- Self-reflection mode
- Debate mode
- Simulation mode
- Expert panel mode
- First principles analyzer
- Red team simulator

### Skills System (15+)
- Skill Library (8+ pre-built skills)
- Skill Builder
- Skill Marketplace
- Skill Chains
- Skill Dependencies
- Skill Import/Export

## Supported AI Models

| Provider | Models |
|----------|--------|
| **OpenRouter** | Claude, GPT-4, Gemini, Llama, Mistral, 100+ |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus |
| **OpenAI** | GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo |
| **Google** | Gemini 1.5 Pro, Gemini 1.5 Flash |

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python 3.13, Flask
- **AI Providers**: Anthropic, OpenAI, Google, OpenRouter
- **Search**: DuckDuckGo, Tavily
- **PWA**: Service Worker, Manifest, Offline Support

## Quick Start

### Prerequisites
- Python 3.10+
- API keys (optional for demo mode)

### Installation

```bash
# Clone the repository
git clone https://github.com/alpha-1-design/aether-pwa.git
cd aether-pwa

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
python server.py
```

### Environment Variables (Optional)

```bash
# Create .env file
cat > .env << 'EOF'
# API Keys (optional - demo mode works without)
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here

# Server
PORT=5000
FLASK_DEBUG=false
EOF
```

### Access
Open browser: `http://localhost:5000`

## Deployment

### Vercel

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy!

### Docker

```bash
docker build -t aether-pwa .
docker run -p 5000:5000 \
  -e ANTHROPIC_API_KEY=your_key \
  aether-pwa
```

### Railway, Render, Heroku
Works with any Python hosting platform.

## Project Structure

```
aether-pwa/
├── index.html      # Main app (PWA)
├── server.py       # Flask backend
├── requirements.txt
├── manifest.json   # PWA manifest
├── sw.js          # Service worker
└── icons.svg      # SVG icons
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+N` | New chat |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Esc` | Close modal/panel |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with cosmic energy and AI power**

*If Elon offers you money for this, take it.*

</div>
