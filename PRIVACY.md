# Privacy Policy

**Last updated:** April 24, 2026

## Overview

Aether AI ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you use our application.

## Data We Collect

### Information You Provide
- **API Keys** - Stored locally in your browser (IndexedDB)
- **Chat Messages** - Stored locally in your browser
- **Custom Agents** - Stored locally in IndexedDB
- **Settings** - Stored in localStorage

### Information We Do NOT Collect
- **Chat History** - Stored only on your device
- **API Keys** - Never transmitted to our servers
- **Personal Data** - We do not require registration

## How We Use Your Data

### Local Processing
All AI interactions happen directly between your browser and the LLM providers. We do not access or store your conversations.

### Provider Communication
When you use an LLM provider (OpenRouter, Anthropic, etc.), your messages are sent directly to that provider's API. Review their privacy policies for data handling practices.

### Code Execution
Code you run via the Piston API is transmitted to their servers. Review the [Piston API Privacy Policy](https://github.com/engineer-man/piston).

## Data Storage

### Local Storage
- **IndexedDB** - Chat history, custom agents
- **localStorage** - Theme preferences, settings

Your data stays on your device unless you:
- Explicitly export it
- Use cross-device sync (local network only)

### Cross-Device Sync
When using Host/Join mode, data is transmitted over your local network only. We do not use cloud servers for sync.

## Data Retention

Chat history and custom agents are retained until you:
- Clear them manually in Settings
- Request data deletion

## Your Rights

### Access
You can view all your stored data in the app.

### Export
Use Settings > Data & Storage > Export Memory to download your data.

### Delete
- Clear chat history: Settings > Data & Storage > Clear Chat History
- Clear all data: Clear browser data for this site

### Portability
Export your data at any time as JSON.

## Third-Party Services

| Service | Data Shared | Privacy Policy |
|----------|-------------|----------------|
| OpenRouter | Messages, model choice | [OpenRouter Privacy](https://openrouter.ai/privacy) |
| Anthropic | Messages | [Anthropic Privacy](https://www.anthropic.com/privacy) |
| Google | Messages | [Google Privacy](https://policies.google.com/privacy) |
| Piston API | Code you run | [Piston Privacy](https://github.com/engineer-man/piston) |
| DuckDuckGo | Search queries | [DuckDuckGo Privacy](https://duckduckgo.com/privacy) |

## Security

### HTTPS
All communication is over HTTPS (or localhost for development).

### Local Storage
API keys are encrypted in browser storage.

### Network Security
Cross-device sync uses your local network only.

## Children's Privacy

Our app is not intended for children under 13. We do not knowingly collect information from children.

## Changes to This Policy

We may update this policy periodically. We will notify you of any material changes by updating the "Last updated" date.

## Contact Us

If you have questions about this Privacy Policy, contact us:
- **Email**: privacy@aether.example.com
- **GitHub**: https://github.com/yourusername/aether-pwa/issues

---

**Your privacy matters to us. Thank you for trusting Aether AI.**