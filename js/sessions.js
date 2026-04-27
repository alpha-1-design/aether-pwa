// js/sessions.js - Conversation Threading & History Management
export class SessionManager {
    constructor() {
        this.currentSessionId = this.getInitialSessionId();
        this.sessions = this.loadSessions();
    }

    getInitialSessionId() {
        return localStorage.getItem('aether_current_session') || `session_${Date.now()}`;
    }

    loadSessions() {
        const saved = localStorage.getItem('aether_sessions');
        return saved ? JSON.parse(saved) : {};
    }

    saveSessions() {
        localStorage.setItem('aether_sessions', JSON.stringify(this.sessions));
    }

    createSession(name = "New Chat") {
        const id = `session_${Date.now()}`;
        this.sessions[id] = {
            id,
            name,
            createdAt: new Date().toISOString(),
            messages: []
        };
        this.currentSessionId = id;
        localStorage.setItem('aether_current_session', id);
        this.saveSessions();
        return id;
    }

    switchSession(id) {
        if (this.sessions[id]) {
            this.currentSessionId = id;
            localStorage.setItem('aether_current_session', id);
            return true;
        }
        return false;
    }

    saveMessage(role, content) {
        if (!this.sessions[this.currentSessionId]) {
            this.createSession();
        }

        const session = this.sessions[this.currentSessionId];
        session.messages.push({ role, content, timestamp: new Date().toISOString() });

        // Auto-update session name based on first user message
        if (session.messages.length === 1 && role === 'user') {
            session.name = content.substring(0, 30) + (content.length > 30 ? '...' : '');
        }

        this.saveSessions();
    }

    getMessages() {
        return this.sessions[this.currentSessionId]?.messages || [];
    }

    deleteSession(id) {
        delete this.sessions[id];
        if (this.currentSessionId === id) {
            this.currentSessionId = this.getInitialSessionId();
            localStorage.setItem('aether_current_session', this.currentSessionId);
        }
        this.saveSessions();
    }

    renameSession(id, newName) {
        if (this.sessions[id]) {
            this.sessions[id].name = newName;
            this.saveSessions();
        }
    }
}
