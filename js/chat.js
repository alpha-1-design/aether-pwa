// js/chat.js (Updated for Sync Integration)

// Import necessary functions
import { sendMessageToAI } from './api.js';
import { getApiKey } from './settings.js';
import { getAllAgents, getAgent } from './store.js';
import { processSearchCommand } from './search.js';
import { sendSyncMessage } from './sync.js'; // Import sendSyncMessage
import { socket } from './sync.js'; // Import socket object to get its ID

// --- DOM Elements ---
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const personaSelect = document.getElementById('personaSelect');

// --- Message Display ---
function displayMessage(role, content, synced = false) { // Added 'synced' parameter
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${role}-message`);
    if (synced) {
        messageElement.classList.add('synced-message');
    }
    const safeContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
    messageElement.innerHTML = safeContent;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// --- Typing Indicator ---
function showTypingIndicator(show) {
    typingIndicator.classList.toggle('hidden', !show);
}

// --- Sending Messages ---
async function handleSendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    // --- Check for specific commands first ---
    const isCommandProcessed = await processSearchCommand(messageText); 
    if (isCommandProcessed) {
        messageInput.value = '';
        sendBtn.disabled = true;
        showTypingIndicator(false);
        return;
    }
    
    // --- If not a command, proceed as normal chat message ---
    displayMessage('user', messageText);
    sendSyncMessage('chat_message', { role: 'user', content: messageText, senderId: socket?.id }); // Send user message via sync

    messageInput.value = '';
    sendBtn.disabled = true;
    showTypingIndicator(true);

    const selectedValue = personaSelect.value; 
    let provider = 'openrouter'; 
    let model = 'deepseek/deepseek-chat'; 
    let systemMessage = null;

    if (selectedValue.startsWith('agent_')) {
        const agentId = parseInt(selectedValue.split('_')[1]);
        try {
            const agent = await getAgent(agentId);
            if (agent) {
                let agentContext = agent.prompt;
                if (agent.knowledge) {
                    agentContext += `

Knowledge Base:
${agent.knowledge}`;
                }
                systemMessage = { role: 'system', content: agentContext };
            } else {
                console.error(`Agent with ID ${agentId} not found.`);
                displayMessage('ai', `Error: Agent not found. Please select a valid LLM.`);
                showTypingIndicator(false);
                return;
            }
        } catch (error) {
            console.error(`Error fetching agent ${agentId}:`, error);
            displayMessage('ai', `Error loading agent details: ${error.message}`);
            showTypingIndicator(false);
            return;
        }
    } else if (selectedValue && selectedValue !== 'default') {
        const parts = selectedValue.split('/');
        if (parts.length > 1) { 
            provider = parts[0];
            model = parts[1];
        } else { 
            model = selectedValue;
            if (!provider) provider = 'openrouter'; 
        }
        const apiKey = getApiKey(provider);
        if (!apiKey) {
            console.error(`API key not found for provider: ${provider}. Please set it in settings.`);
            displayMessage('ai', `Error: API key not found for ${provider}. Please set it in settings.`);
            showTypingIndicator(false);
            return; 
        }
    } else { // Default LLM
        provider = 'openrouter'; 
        model = 'deepseek/deepseek-chat'; 
    }

    let messagesToSend = [];
    if (systemMessage) {
        messagesToSend.push(systemMessage);
    }
    messagesToSend.push({ role: 'user', content: messageText });

    console.log(`Sending message: Provider=${provider}, Model=${model}, Messages=${messagesToSend.length}`);

    const streamResult = await sendMessageToAI(messageText, provider, model, messagesToSend); 

    if (streamResult && streamResult.stream) {
        let fullResponse = '';
        try {
            for await (const chunk of streamResult.stream()) {
                if (chunk) {
                    fullResponse += chunk;
                }
            }
            displayMessage('ai', fullResponse);
            sendSyncMessage('chat_message', { role: 'ai', content: fullResponse, senderId: socket?.id }); // Sync AI response
        } catch (error) {
            console.error("Streaming error:", error);
            displayMessage('ai', `Error: ${error.message || 'Failed to get response.'}`);
        }
    } else if (streamResult && streamResult.error) {
        displayMessage('ai', `Error: ${streamResult.error}`);
    } else {
        displayMessage('ai', 'An unknown error occurred.');
    }

    showTypingIndicator(false);
    if (messageInput.value.trim()) {
        sendBtn.disabled = false;
    } else {
        sendBtn.disabled = true;
    }
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
