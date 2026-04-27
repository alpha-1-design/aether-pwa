// js/sync.js - Cross-Device Sync via Socket.IO

let socket = null;
let sessionId = null;
let isHost = false;
let messageHandlers = [];
let connectionHandlers = [];

export function getSocket() {
    return socket;
}

export function isConnected() {
    return socket && socket.connected;
}

export function getSessionId() {
    return sessionId;
}

export function getIsHost() {
    return isHost;
}

export function onSyncMessage(handler) {
    messageHandlers.push(handler);
}

export function onConnectionChange(handler) {
    connectionHandlers.push(handler);
}

export function removeMessageHandler(handler) {
    messageHandlers = messageHandlers.filter(h => h !== handler);
}

export function removeConnectionHandler(handler) {
    connectionHandlers = connectionHandlers.filter(h => h !== handler);
}

function notifyConnectionChange(connected) {
    connectionHandlers.forEach(h => h({
        connected,
        isHost,
        sessionId
    }));
}

function notifyMessage(syncType, data) {
    messageHandlers.forEach(h => h(syncType, data));
}

export async function hostSession() {
    return new Promise((resolve, reject) => {
        sessionId = generateSessionId();
        isHost = true;

        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = () => {
            connect().then(() => {
                socket.emit('join_session', { session_id: sessionId, is_host: true });
                notifyConnectionChange(true);
                resolve({ sessionId, isHost: true });
            }).catch(reject);
        };
        script.onerror = () => reject(new Error('Failed to load Socket.IO'));
        document.head.appendChild(script);
    });
}

export async function joinSession(code) {
    return new Promise((resolve, reject) => {
        sessionId = code.toUpperCase();
        isHost = false;

        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = () => {
            connect().then(() => {
                socket.emit('join_session', { session_id: sessionId, is_host: false });
                notifyConnectionChange(true);
                resolve({ sessionId, isHost: false });
            }).catch(reject);
        };
        script.onerror = () => reject(new Error('Failed to load Socket.IO'));
        document.head.appendChild(script);
    });
}

function connect() {
    return new Promise((resolve, reject) => {
        const serverUrl = getServerUrl();
        
        socket = window.io(serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('Socket.IO connected:', socket.id);
            notifyConnectionChange(true);
            resolve();
        });

        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            notifyConnectionChange(false);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err);
            reject(err);
        });

        socket.on('message', (data) => {
            console.log('Socket message:', data);
        });

        socket.on('error', (data) => {
            console.error('Socket error:', data);
        });

        socket.on('receive_sync_message', (data) => {
            if (data.message) {
                notifyMessage(data.message.syncType, data.message.data);
            }
        });

        socket.on('connected_devices_update', (data) => {
            console.log('Devices update:', data.devices?.length || 0);
        });

        setTimeout(() => {
            if (!socket || !socket.connected) {
                reject(new Error('Connection timeout'));
            }
        }, 5000);
    });
}

export function leaveSession() {
    if (socket && sessionId) {
        socket.emit('leave_session', { session_id: sessionId });
        socket.disconnect();
        socket = null;
    }
    sessionId = null;
    isHost = false;
    notifyConnectionChange(false);
}

export function sendSyncMessage(type, data) {
    if (!socket || !socket.connected || !sessionId) {
        console.warn('Socket.IO not connected');
        return false;
    }

    socket.emit('send_sync_message', {
        session_id: sessionId,
        message: { syncType: type, data }
    });
    return true;
}

function getServerUrl() {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname;
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl;
    const port = 5000;
    return `${protocol}//${host}:${port}`;
}

function generateSessionId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export function generateQRCode(data) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

export function getSyncState() {
    return {
        connected: socket && socket.connected,
        isHost,
        sessionId,
        peers: 0
    };
}

export function getPeers() {
    return [];
}

export { socket };