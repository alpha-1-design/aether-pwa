# Security Policy

**Last updated:** April 24, 2026

## Supported Versions

We actively support and provide security updates for:

| Version | Supported |
|---------|----------|
| 1.0.x | Yes |

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue
2. **Email**: security@aether.example.com
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Fix timeline**: Depending on severity

## Security Best Practices

### For Users

#### API Key Security
- Never share your API keys
- Use environment variables when possible
- Rotate keys periodically
- Use provider dashboards to monitor usage

#### Network Security
- Only use cross-device sync on trusted networks
- Avoid public WiFi for sensitive conversations
- Use HTTPS in production

### For Developers

#### Code Security
- Never commit API keys or secrets
- Use environment variables
- Validate all inputs
- Sanitize user inputs before display

#### Dependencies
- Keep dependencies updated
- Review security advisories
- Use automated Scanning

## Security Features

### Data Protection
- API keys stored in browser encrypted storage
- No cloud storage of conversations
- Local-first architecture

### Network Security
- HTTPS enforced in production
- CORS configured for your domains only
- No sensitive data in URLs

### Input Validation
- Client-side validation for all forms
- Server-side validation for API endpoints
- Rate limiting on API endpoints

## Incident Response

In case of a security incident:

1. **Assess** - Determine scope and impact
2. **Notify** - Alert affected users
3. **Contain** - Stop further exposure
4. **Remediate** - Fix vulnerabilities
5. **Review** - Update security measures

## Acknowledgments

Thank you to the security researchers who help keep Aether AI secure.

---

**Security is a shared responsibility. Thank you for helping us keep Aether AI safe.**