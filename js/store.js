// js/store.js - IndexedDB Agent Storage

const DB_NAME = "aether-pwa";
const DB_VERSION = 1;
const AGENTS_STORE = "agents";
const CHATS_STORE = "chats";

let db = null;

export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            
            if (!database.objectStoreNames.contains(AGENTS_STORE)) {
                const agentStore = database.createObjectStore(AGENTS_STORE, { keyPath: "id" });
                agentStore.createIndex("name", "name", { unique: false });
                agentStore.createIndex("created", "createdAt", { unique: false });
            }
            
            if (!database.objectStoreNames.contains(CHATS_STORE)) {
                const chatStore = database.createObjectStore(CHATS_STORE, { keyPath: "id" });
                chatStore.createIndex("updated", "updatedAt", { unique: false });
            }
        };
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export async function createAgent(name, prompt, knowledge = "", avatar = "") {
    await initDB();
    
    const agent = {
        id: generateId(),
        name,
        prompt,
        knowledge,
        avatar,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(AGENTS_STORE, "readwrite");
        const store = tx.objectStore(AGENTS_STORE);
        const request = store.add(agent);
        
        request.onsuccess = () => resolve(agent);
        request.onerror = () => reject(request.error);
    });
}

export async function updateAgent(id, updates) {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(AGENTS_STORE, "readwrite");
        const store = tx.objectStore(AGENTS_STORE);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const agent = getRequest.result;
            if (!agent) {
                reject(new Error("Agent not found"));
                return;
            }
            
            const updated = { ...agent, ...updates, updatedAt: Date.now() };
            const putRequest = store.put(updated);
            
            putRequest.onsuccess = () => resolve(updated);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

export async function deleteAgent(id) {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(AGENTS_STORE, "readwrite");
        const store = tx.objectStore(AGENTS_STORE);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getAgent(id) {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(AGENTS_STORE, "readonly");
        const store = tx.objectStore(AGENTS_STORE);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function getAllAgents() {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(AGENTS_STORE, "readonly");
        const store = tx.objectStore(AGENTS_STORE);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function saveChat(chat) {
    await initDB();
    
    const chatData = {
        id: chat.id || generateId(),
        title: chat.title || "New Chat",
        messages: chat.messages || [],
        agentId: chat.agentId || null,
        createdAt: chat.createdAt || Date.now(),
        updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(CHATS_STORE, "readwrite");
        const store = tx.objectStore(CHATS_STORE);
        const request = store.put(chatData);
        
        request.onsuccess = () => resolve(chatData);
        request.onerror = () => reject(request.error);
    });
}

export async function getChat(id) {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CHATS_STORE, "readonly");
        const store = tx.objectStore(CHATS_STORE);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function getAllChats() {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CHATS_STORE, "readonly");
        const store = tx.objectStore(CHATS_STORE);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const chats = request.result || [];
            chats.sort((a, b) => b.updatedAt - a.updatedAt);
            resolve(chats);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function deleteChat(id) {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CHATS_STORE, "readwrite");
        const store = tx.objectStore(CHATS_STORE);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function clearAllChats() {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CHATS_STORE, "readwrite");
        const store = tx.objectStore(CHATS_STORE);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function exportData() {
    const agents = await getAllAgents();
    const chats = await getAllChats();
    
    return { agents, chats, exportedAt: Date.now() };
}

export async function importData(data) {
    if (data.agents) {
        for (const agent of data.agents) {
            await createAgent(agent.name, agent.prompt, agent.knowledge, agent.avatar);
        }
    }
    if (data.chats) {
        for (const chat of data.chats) {
            await saveChat(chat);
        }
    }
}

export { generateId };