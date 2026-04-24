# Contributing to Aether AI

Thank you for your interest in contributing to Aether AI!

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to creating a welcoming and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. **Search existing issues** - Avoid duplicate reports
2. **Use the bug template** - Include all requested information
3. **Be specific** - Provide steps to reproduce, expected vs actual behavior
4. **Include context** - Browser, OS, version numbers

### Suggesting Features

1. **Check the roadmap** - See [CHANGELOG.md](CHANGELOG.md) for planned features
2. **Open a discussion** - Gauge interest before submitting PRs
3. **Use the feature template** - Describe the problem and solution
4. **Be open to feedback** - The team may suggest alternatives

### Pull Requests

#### Before Submitting

1. **Fork the repository**
2. **Create a feature branch** - `git checkout -b feature/my-feature`
3. **Check existing tests** - Add tests for new functionality
4. **Run linting** - Ensure code passes all checks

#### PR Guidelines

- **Keep PRs focused** - One feature or fix per PR
- **Write descriptive titles** - "Add X feature" not "Fixed stuff"
- **Describe changes** - Explain what, why, and how
- **Link issues** - Reference the issue number

```bash
# Good PR title
Add OpenCode Zen provider support

# Good PR description
Fixes #123
Adds OpenCode Zen as a new LLM provider with free models:
- Big Pickle
- MiniMax M2.5 Free
```

#### PR Process

1. **Submit the PR** - Wait for automated checks
2. **Respond to feedback** - Address review comments
3. **Wait for review** - The team reviews within 48 hours
4. **Merge or close** - PR is merged when approved

## Development Setup

### Local Development

```bash
# Clone and setup
git clone https://github.com/yourusername/aether-pwa.git
cd aether-pwa

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python api/server.py
```

### Running Tests

```bash
# Test Python code
pytest

# Test frontend (if available)
npm test
```

### Coding Standards

#### JavaScript
- Use ES6+ modules
- Use `const` and `let` - Never `var`
- Use meaningful variable names
- Comment complex logic
- Maximum line length: 100

#### Python
- Follow PEP 8
- Use type hints where helpful
- Maximum line length: 88 (Black default)
- Docstrings for functions

#### CSS
- Use CSS custom properties
- Follow BEM naming for classes
- Mobile-first approach
- Accessibility considerations

## Features in Development

### Planned Features
- [ ] Real-time collaboration
- [ ] Advanced analytics
- [ ] Autonomous workflows

### Up for Grabs
Help us build these features:
- [ ] Better offline support
- [ ] Keyboard shortcuts
- [ ] Markdown preview

## Recognition

All contributors are recognized in [AUTHORS.md](AUTHORS.md).

## Questions?

- **Discord**: Join our community
- **Discussions**: Ask on GitHub
- **Email**: Contact the maintainers

---

**Thank you for contributing to Aether AI!**