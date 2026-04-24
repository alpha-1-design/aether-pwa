// Aether PWA - Store (IndexedDB wrapper) (Reborn v1.0.0)
const DB_NAME = 'aether_pwa';
const DB_VERSION = 2;

let db = null;

export async function initStore() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            if (!database.objectStoreNames.contains('agents')) {
                database.createObjectStore('agents', { keyPath: 'id' });
            }
            
            if (!database.objectStoreNames.contains('messages')) {
                database.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
            }
            
            if (!database.objectStoreNames.contains('sessions')) {
                database.createObjectStore('sessions', { keyPath: 'id' });
            }
            
            if (!database.objectStoreNames.contains('memory')) {
                database.createObjectStore('memory', { keyPath: 'id' });
            }
            
            if (!database.objectStoreNames.contains('conversations')) {
                database.createObjectStore('conversations', { keyPath: 'id' });
            }
        };
    });
}

function getStore(storeName) {
    return db.transaction(storeName, 'readonly').objectStore(storeName);
}

function getStoreWritable(storeName) {
    return db.transaction(storeName, 'readwrite').objectStore(storeName);
}

export async function add(storeName, data) {
    return new Promise((resolve, reject) => {
        const store = getStoreWritable(storeName);
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function put(storeName, data) {
    return new Promise((resolve, reject) => {
        const store = getStoreWritable(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function remove(storeName, id) {
    return new Promise((resolve, reject) => {
        const store = getStoreWritable(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function get(storeName, id) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getAll(storeName) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function clear(storeName) {
    return new Promise((resolve, reject) => {
        const store = getStoreWritable(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export function saveAPIKey(provider, key) {
    if (!key) return;
    try {
        localStorage.setItem(`aether_${provider}_key`, key);
    } catch (e) {
        console.error('Failed to save API key:', e);
    }
}

export function getAPIKey(provider) {
    try {
        return localStorage.getItem(`aether_${provider}_key`) || '';
    } catch (e) {
        return '';
    }
}

export function getAllAPIKeys() {
    const providers = ['openrouter', 'groq', 'cerebras', 'google', 'opencode', 'huggingface', 'cohere', 'github', 'cloudflare', 'mistral', 'openai', 'anthropic'];
    const keys = {};
    providers.forEach(p => { keys[p] = getAPIKey(p); });
    return keys;
}

export function hasAPIKeys() {
    const keys = getAllAPIKeys();
    return Object.values(keys).some(v => v && v.length > 0);
}

export function saveSetting(key, value) {
    try {
        localStorage.setItem(`aether_${key}`, JSON.stringify(value));
    } catch (e) {
        console.error('Failed to save setting:', e);
    }
}

export function getSetting(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(`aether_${key}`);
        return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

export async function getSettingAsync(key, defaultValue = null) {
    const value = getSetting(key, '__UNSET__');
    return value === '__UNSET__' ? defaultValue : value;
}

export function deleteSetting(key) {
    try {
        localStorage.removeItem(`aether_${key}`);
    } catch (e) {
        console.error('Failed to delete setting:', e);
    }
}

export async function saveSession(messages) {
    const session = {
        id: 'session_' + Date.now(),
        timestamp: new Date().toISOString(),
        messages: messages
    };
    return put('sessions', session);
}

export async function getSessions() {
    return getAll('sessions');
}

export async function clearSessions() {
    return clear('sessions');
}

export async function saveMemory(key, value) {
    return put('memory', { id: key, value: value, timestamp: new Date().toISOString() });
}

export async function getMemory(key) {
    const mem = await get('memory', key);
    return mem ? mem.value : null;
}

export async function clearMemory() {
    return clear('memory');
}

export async function saveConversation(id, messages) {
    return put('conversations', { id, messages, timestamp: new Date().toISOString() });
}

export async function getConversation(id) {
    return get('conversations', id);
}

export async function getAllConversations() {
    return getAll('conversations');
}

export async function clearConversations() {
    return clear('conversations');
}

export async function exportData() {
    const data = {
        exportDate: new Date().toISOString(),
        version: 'reborn-1.0.0',
        settings: {},
        agents: await getAll('agents'),
        sessions: await getAll('sessions'),
        conversations: await getAll('conversations'),
    };
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('aether_')) {
            data.settings[key] = getSetting(key.replace('aether_', ''));
        }
    }
    
    return data;
}

export async function importData(data) {
    if (data.settings) {
        Object.entries(data.settings).forEach(([k, v]) => saveSetting(k, v));
    }
    if (data.agents) {
        for (const agent of data.agents) {
            await put('agents', agent);
        }
    }
    if (data.conversations) {
        for (const conv of data.conversations) {
            await put('conversations', conv);
        }
    }
}

export default {
    initStore, add, put, remove, get, getAll, clear,
    saveAPIKey, getAPIKey, getAllAPIKeys, hasAPIKeys,
    saveSetting, getSetting, getSettingAsync, deleteSetting,
    saveSession, getSessions, clearSessions,
    saveMemory, getMemory, clearMemory,
    saveConversation, getConversation, getAllConversations,
    exportData, importData
};