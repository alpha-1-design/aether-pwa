# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [reborn-1.0.0] - 2026-04-24

### Added
- **PWA Support** - Installable as native app (feels like native)
- **11+ LLM Providers**:
  - OpenRouter (DeepSeek, Llama, Qwen, Gemini)
  - Groq (Llama 3.3, Mixtral, DeepSeek R1)
  - Cerebras (Llama 3.1, GPT OSS 120B)
  - Google Gemini (1.5 Flash, 2.0 Flash)
  - OpenCode Zen (Big Pickle, MiniMax, GLM, Kimi)
  - HuggingFace, Cohere, GitHub, Cloudflare, Mistral, OpenAI, Anthropic
- **Custom Agents** - Create agents with personalities
- **Code Execution** - Run code in 20+ languages via Piston API
- **Web Search** - DuckDuckGo integration
- **File Upload** - Images, PDFs support
- **Voice Input** - Web Speech API + voice memo recording
- **Cross-Device Sync** - Host/Join via WebSocket
- **Theme System** - Space Dark, Light, Glass themes
- **Glassmorphism UI** - Professional design
- **Atom Logo Animation** - Rotating rings when AI thinks
- **3 Main Tabs** - Chat, Agents, Settings
- **7 Settings Sections** - API Keys, Models, Appearance, Voice, Cross-Device, Data, About

### New Features (Reborn)
- **Fork Conversation** - Fork current conversation to new session
- **Token Usage Display** - See tokens used per request in header
- **Professional Error Handling** - Toast notifications, error codes
- **Export/Import Data** - Full data portability

### Technical
- Flask backend with /api/chat, /api/search, /api/models, /api/execute endpoints
- IndexedDB v2 for local storage
- Service worker for offline support
- WebSocket for real-time sync
- GitHub Actions CI/CD workflow

### Documentation
- README.md - Full project documentation
- CONTRIBUTING.md - Contribution guidelines
- PRIVACY.md - Data collection and storage policy
- SECURITY.md - Security reporting
- CODE_OF_CONDUCT.md - Community guidelines

---

## [legacy-0.1.0] - 2026-04-01

### Added
- Initial prototype
- Basic chat interface
- Single LLM provider support

---

## Future Plans

### Planned Features
- [ ] Real-time collaboration
- [ ] Advanced analytics
- [ ] Autonomous workflows
- [ ] Better offline support
- [ ] Keyboard shortcuts

### Up for Grabs
Help us build:
- [ ] More themes
- [ ] Additional language support
- [ ] Markdown preview
- [ ] PDF generation

---

## Upgrade Guide

### From legacy to reborn
1. Clear old browser data
2. Re-enter API keys
3. Export old data if needed for reference