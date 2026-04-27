// js/memory.js - Long-Term Memory (RAG) System
export class MemoryManager {
    constructor() {
        this.memoryKey = 'aether_long_term_memory';
        this.memories = this.loadMemories();
    }

    loadMemories() {
        const saved = localStorage.getItem(this.memoryKey);
        return saved ? JSON.parse(saved) : [];
    }

    saveMemories() {
        localStorage.setItem(this.memoryKey, JSON.stringify(this.memories));
    }

    // Store a new fact or preference
    remember(fact) {
        const timestamp = new Date().toISOString();
        this.memories.push({ fact, timestamp });
        this.saveMemories();
        return `Memory saved: ${fact}`;
    }

    // Retrieve relevant memories based on a keyword/query
    // In a full RAG system, this would use embeddings.
    // Here we use a smart keyword-based retrieval for the PWA.
    query(text) {
        if (this.memories.length === 0) return "";

        const keywords = text.toLowerCase().split(' ').filter(w => w.length > 3);
        const relevant = this.memories.filter(m =>
            keywords.some(k => m.fact.toLowerCase().includes(k))
        );

        if (relevant.length === 0) return "";

        return "Relevant context from long-term memory:\n" +
               relevant.map(m => `- ${m.fact}`).join('\n');
    }

    forgetAll() {
        this.memories = [];
        this.saveMemories();
    }

    getMemoryCount() {
        return this.memories.length;
    }
}
