// js/chat.js - Chat UI with Backend Integration

import { sendMessageToAI, streamMessageToAI, getAvailableModels, FREE_MODELS } from './api.js';
import { getApiKey } from './settings.js';
import { getAllAgents, getAgent } from './store.js';
import { processSearchCommand } from './search.js';
import { sendSyncMessage } from './sync.js';
import { socket } from './sync.js';
import { TaskManager } from './tasks.js';
import { SessionManager } from './sessions.js';
import { MemoryManager } from './memory.js';

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const sendIcon = document.getElementById('sendIcon');
const typingIndicator = document.getElementById('typingIndicator');
const personaSelect = document.getElementById('personaSelect');

const taskManager = new TaskManager('taskPanel');
window.taskManager = taskManager;

const sessionManager = new SessionManager();
window.sessionManager = sessionManager;

const memoryManager = new MemoryManager();
window.memoryManager = memoryManager;

let availableModels = null;
let abortController = null;

let availableModels = null;

function getBackendUrl() {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl;
    return '';
}

async function fetchModelsFromBackend(provider) {
    try {
        const baseUrl = getBackendUrl();
        const resp = await fetch(`${baseUrl}/api/models?provider=${provider}`);
        if (resp.ok) {
            const data = await resp.json();
            return data.free || [];
        }
    } catch (e) {
        console.log('Backend unavailable, using hardcoded models');
    }
    return FREE_MODELS[provider] || [];
}

function displayMessage(role, content, synced = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${role}-message`);
    if (synced) messageElement.classList.add('synced-message');

    // Use marked for markdown rendering if available, otherwise fallback to basic sanitization
    if (window.marked) {
        // Configure marked to use highlight.js for code blocks
        marked.setOptions({
            highlight: function(code, lang) {
                if (window.hljs) {
                    return hljs.highlightAuto(code).value;
                }
                return code;
            }
        });
        messageElement.innerHTML = marked.parse(content);
    } else {
        const safeContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
        messageElement.innerHTML = safeContent;
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator(show) {
    typingIndicator.classList.toggle('hidden', !show);
}

function updateSendButton() {
    sendBtn.disabled = messageInput.value.trim() === '';
}

async function handleSendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    const isCommandProcessed = await processSearchCommand(messageText);
    if (isCommandProcessed) {
        messageInput.value = '';
        updateSendButton();
        return;
    }

    displayMessage('user', messageText);
    sendSyncMessage('chat_message', { role: 'user', content: messageText, senderId: socket?.id });

    messageInput.value = '';
    updateSendButton();
    showTypingIndicator(true);
    sendBtn.disabled = true;
    messageInput.disabled = true;

    const selectedValue = personaSelect.value;
    let provider = 'openrouter';
    let model = 'deepseek/deepseek-chat';
    let systemMessage = null;

    if (selectedValue.startsWith('agent_')) {
        const agentId = selectedValue.split('_')[1];
        try {
            const agent = await getAgent(agentId);
            if (agent) {
                let agentContext = agent.prompt;
                if (agent.knowledge) agentContext += `\n\nKnowledge:\n${agent.knowledge}`;
                systemMessage = { role: 'system', content: agentContext };
            } else {
                displayMessage('ai', 'Agent not found. Please select a valid LLM.');
                showTypingIndicator(false);
                return;
            }
        } catch (error) {
            displayMessage('ai', `Error loading agent: ${error.message}`);
            showTypingIndicator(false);
            sendBtn.disabled = false;
            messageInput.disabled = false;
            updateSendButton();
            return;
        }
    } else if (selectedValue && selectedValue !== 'default') {
        const parts = selectedValue.split('/');
        if (parts.length > 1) {
            provider = parts[0];
            model = parts[1];
        } else {
            model = selectedValue;
        }
    }

    let apiKey = getApiKey(provider);
    if (!apiKey) {
        apiKey = localStorage.getItem(`aether_api_key_${provider}`);
    }
    if (!apiKey) {
        displayMessage('ai', `API key for ${provider} not found. Add it in Settings → API Keys.`);
        showTypingIndicator(false);
        sendBtn.disabled = false;
        messageInput.disabled = false;
        updateSendButton();
        return;
    }

    let messagesToSend = [];
    if (systemMessage) messagesToSend.push(systemMessage);

    // Inject Long-Term Memory into the conversation
    const memoryContext = memoryManager.query(messageText);
    if (memoryContext) {
        messagesToSend.push({
            role: 'system',
            content: `User's Long-Term Memory:\n${memoryContext}\n\nUse this context to personalize your response.`
        });
    }

    messagesToSend.push({ role: 'user', content: messageText });

    let fullResponse = '';
    try {
        const streamResult = await sendMessageToAI(messageText, provider, model, messagesToSend, apiKey);

        if (streamResult && streamResult.stream) {
            for await (const chunk of streamResult.stream()) {
                if (chunk) {
                    // MEMORY TRIGGER: Check if the AI is explicitly remembering something
                    const rememberMatch = chunk.match(/\[REMEMBER: (.+?)\]/);
                    if (rememberMatch) {
                        memoryManager.remember(rememberMatch[1]);
                        chunk = chunk.replace(/\[REMEMBER: .+?\]/, '');
                    }

                    const taskAddMatch = chunk.match(/\[TASK: (.+?)\]/);
                    if (taskAddMatch) {
                        taskManager.addTask(taskAddMatch[1]);
                        chunk = chunk.replace(/\[TASK: .+?\]/, '');
                    }
                    const taskDoneMatch = chunk.match(/\[TASK_DONE: (\d+)\]/);
                    if (taskDoneMatch) {
                        taskManager.updateTaskStatus(taskDoneMatch[1], 'completed');
                        chunk = chunk.replace(/\[TASK_DONE: \d+\]/, '');
                    }
                    const taskProgressMatch = chunk.match(/\[TASK_START: (\d+)\]/);
                    if (taskProgressMatch) {
                        taskManager.updateTaskStatus(taskProgressMatch[1], 'in_progress');
                        chunk = chunk.replace(/\[TASK_START: \d+\]/, '');
                    }
                    fullResponse += chunk;
                }
            }
        } else if (streamResult && streamResult.error) {
            displayMessage('ai', `Error: ${streamResult.error}`);
            showTypingIndicator(false);
            return;
        } else if (typeof streamResult === 'string') {
            fullResponse = streamResult;
        }
    } catch (error) {
        console.error('Chat error:', error);
        displayMessage('ai', `Error: ${error.message}`);
        showTypingIndicator(false);
        sendBtn.disabled = false;
        messageInput.disabled = false;
        updateSendButton();
        return;
    }

    displayMessage('ai', fullResponse);
    sendSyncMessage('chat_message', { role: 'ai', content: fullResponse, senderId: socket?.id });
    showTypingIndicator(false);
    updateSendButton();
    messageInput.disabled = false;
    messageInput.style.height = 'auto'; // Reset height after sending
}

// --- UI Initialization ---
export function initializeChatUI() {
    if (messageInput && sendBtn) {
        messageInput.addEventListener('input', () => {
            sendBtn.disabled = messageInput.value.trim() === '';
        });
        sendBtn.addEventListener('click', handleSendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
                e.preventDefault(); 
                handleSendMessage();
            }
        });
    }

    if(sendBtn) sendBtn.disabled = messageInput.value.trim() === '';
    showTypingIndicator(false); 
    
    if (personaSelect) {
        loadChatOptions(); 
    }
}

// --- Loading LLMs and Custom Agents for Selection ---
export async function loadChatOptions(defaultProvider = 'openrouter') { 
    if (!personaSelect) return;

    personaSelect.innerHTML = '<option value="">Loading options...</option>';
    personaSelect.disabled = true;

    try {
        const llmResponse = await fetch(`/api/models?provider=${defaultProvider}`);
        if (!llmResponse.ok) {
            throw new Error(`HTTP error loading models: ${llmResponse.status}`);
        }
        const llmData = await llmResponse.json();

        const agents = await getAllAgents();

        personaSelect.innerHTML = ''; 

        const defaultLLMOption = document.createElement('option');
        defaultLLMOption.value = 'default'; 
        defaultLLMOption.textContent = 'Default LLM (OpenRouter)';
        personaSelect.appendChild(defaultLLMOption);

        if (llmData.free && llmData.free.length > 0) {
            llmData.free.forEach(model => {
                const option = document.createElement('option');
                option.value = model; 
                option.textContent = `${defaultProvider}/${model}`; 
                personaSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = 'default-model'; 
            option.textContent = 'Default Model';
            personaSelect.appendChild(option);
        }
        
        if (agents.length > 0) {
            const agentOptgroup = document.createElement('optgroup');
            agentOptgroup.label = 'Custom Agents'; 
            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = `agent_${agent.id}`; 
                option.textContent = agent.name;
                agentOptgroup.appendChild(option);
            });
            personaSelect.appendChild(agentOptgroup);
        } else {
            const noAgentsOption = document.createElement('option');
            noAgentsOption.value = 'no-agents';
            noAgentsOption.textContent = 'No agents created yet';
            noAgentsOption.disabled = true; 
            personaSelect.appendChild(noAgentsOption);
        }
        
        personaSelect.value = 'default'; 
        
    } catch (error) {
        console.error("Error loading chat options:", error);
        personaSelect.innerHTML = '<option value="error">Error loading options</option>';
        personaSelect.value = 'error'; 
    } finally {
        personaSelect.disabled = false; 
    }
}

if (personaSelect) {
    personaSelect.addEventListener('change', async () => {
        const selectedValue = personaSelect.value;
        
        if (messageInput.value.trim()) {
            sendBtn.disabled = false;
        } else {
            sendBtn.disabled = true;
        }

        if (selectedValue.startsWith('agent_')) {
            console.log(`Agent selected: ${selectedValue}`);
            if (messageInput.value.trim()) {
                sendBtn.disabled = false;
            }
        } else if (selectedValue && selectedValue !== 'default' && selectedValue !== 'error' && selectedValue !== 'no-agents') {
            const parts = selectedValue.split('/');
            let provider = 'openrouter'; 
            let model = selectedValue;

            if (parts.length > 1) { 
                provider = parts[0];
                model = parts[1];
            }
            console.log(`Selected LLM: ${provider}/${model}`);
            
            const apiKey = getApiKey(provider);
            if (!apiKey) {
                alert(`API key for ${provider} is not set. Please add it in settings.`);
            }
        } else if (selectedValue === 'default') {
            console.log(`Using default LLM: openrouter/deepseek-chat`);
        }
    });
}

// Export displayMessage so other modules can use it
export { displayMessage };
window.displayMessage = displayMessage;
