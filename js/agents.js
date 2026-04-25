// js/agents.js (Updated for Sync Integration)

import { addAgent, getAllAgents, getAgent, updateAgent, deleteAgent } from './store.js';
import { sendSyncMessage } from './sync.js'; // Import sendSyncMessage
import { loadChatOptions } from './chat.js'; // Import loadChatOptions to refresh personaSelect

// --- DOM Elements ---
const createAgentBtn = document.getElementById('createAgentBtn');
const emptyCreateAgentBtn = document.getElementById('emptyCreateAgentBtn');
const agentModal = document.getElementById('agentModal');
const agentModalHeader = agentModal.querySelector('.modal-header h3');
const agentNameInput = document.getElementById('agentNameInput');
const agentPromptInput = document.getElementById('agentPromptInput');
const agentKnowledgeInput = document.getElementById('agentKnowledgeInput'); 
const saveAgentBtn = agentModal.querySelector('#saveAgentBtn');
const modalCloseBtns = agentModal.querySelectorAll('.modal-close, .secondary-btn');
const modalOverlay = document.getElementById('modalOverlay');
const agentsListContainer = document.getElementById('agentsList');

// File upload specific elements
const agentKnowledgeFileInput = document.getElementById('agentKnowledgeFileInput'); 
const knowledgeFileLabel = document.querySelector('label[for="agentKnowledgeFileInput"]'); 
const knowledgeFileNameDisplay = document.createElement('span'); 
if (knowledgeFileLabel) {
    knowledgeFileLabel.appendChild(knowledgeFileNameDisplay);
}

let editingAgentId = null; 
let loadedFileContent = ''; 

// --- File Reading and Handling ---
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => { resolve(event.target.result); };
        reader.onerror = (event) => { reject(new Error(`Failed to read file: ${file.name}`)); };
        reader.readAsText(file); 
    });
}

async function processFile(file) {
    if (!file) return;
    const allowedTypes = ['text/plain']; 
    const isAllowedType = allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.txt');
    
    if (agentKnowledgeInput) agentKnowledgeInput.value = ''; 
    if (knowledgeFileNameDisplay) knowledgeFileNameDisplay.textContent = '';
    loadedFileContent = ''; 

    if (!isAllowedType) {
        alert(`File type not supported for agent knowledge: ${file.name}. Please upload plain text files (.txt).`);
        return;
    }

    try {
        const content = await readFileContent(file);
        loadedFileContent = content; 

        if (agentKnowledgeInput) {
            agentKnowledgeInput.value = `Content from ${file.name}:

${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`;
            agentKnowledgeInput.rows = 5; 
        }
        if (knowledgeFileNameDisplay) {
            knowledgeFileNameDisplay.textContent = `Selected: ${file.name}`;
            knowledgeFileNameDisplay.style.color = '#22d3ee'; 
        }
        console.log(`File content loaded: ${file.name}`);
        alert(`Successfully loaded knowledge from ${file.name}.`); 
    } catch (error) {
        console.error("Error processing file:", error);
        alert(error.message);
        if (agentKnowledgeInput) agentKnowledgeInput.value = '';
        if (knowledgeFileNameDisplay) knowledgeFileNameDisplay.textContent = '';
        loadedFileContent = '';
    }
}


// --- Modal Handling ---
function showAgentModal(agent = null) {
    modalOverlay.classList.remove('hidden');
    agentModal.classList.remove('hidden');

    if (agentKnowledgeInput) {
        agentKnowledgeInput.value = ''; 
        agentKnowledgeInput.rows = 3;
    }
    if (knowledgeFileNameDisplay) {
        knowledgeFileNameDisplay.textContent = ''; 
    }
    loadedFileContent = ''; 
    editingAgentId = null; 

    if (agent) {
        agentModalHeader.textContent = 'Edit Agent';
        agentNameInput.value = agent.name;
        agentPromptInput.value = agent.prompt;
        
        if (agent.knowledge) {
            loadedFileContent = agent.knowledge;
            if (agentKnowledgeInput) {
                agentKnowledgeInput.value = `Existing knowledge:

${agent.knowledge.substring(0, 200)}${agent.knowledge.length > 200 ? '...' : ''}`;
                agentKnowledgeInput.rows = 5;
            }
        }
        editingAgentId = agent.id;
    } else {
        agentModalHeader.textContent = 'Create Agent';
        agentNameInput.value = '';
        agentPromptInput.value = '';
    }
}

function hideAgentModal() {
    modalOverlay.classList.add('hidden');
    agentModal.classList.add('hidden');
    agentNameInput.value = '';
    agentPromptInput.value = '';
    if (agentKnowledgeInput) agentKnowledgeInput.value = '';
    if (knowledgeFileNameDisplay) knowledgeFileNameDisplay.textContent = '';
    editingAgentId = null; 
    loadedFileContent = '';
}

// --- Agent Management Functions ---
async function saveAgent() {
    const name = agentNameInput.value.trim();
    const prompt = agentPromptInput.value.trim();
    const knowledge = loadedFileContent || (agentKnowledgeInput ? agentKnowledgeInput.value.trim() : ''); 

    if (!name || !prompt) {
        alert("Agent name and system prompt are required.");
        return;
    }

    const agentData = {
        name: name,
        prompt: prompt,
        knowledge: knowledge 
    };

    try {
        if (editingAgentId !== null) {
            agentData.id = editingAgentId; 
            await updateAgent(agentData);
            console.log("Agent updated:", agentData);
            sendSyncMessage('agent_update', { type: 'updated', agent: agentData }); 
        } else {
            const newAgentId = await addAgent(agentData);
            agentData.id = newAgentId; 
            console.log("Agent added:", agentData);
            sendSyncMessage('agent_update', { type: 'added', agent: agentData }); 
        }
        await renderAgentsList(); 
        hideAgentModal();
        loadChatOptions(); 
    } catch (error) {
        console.error("Failed to save agent:", error);
        alert("Error saving agent. Please check the console for details.");
    }
}

async function renderAgentsList() {
    const agents = await getAllAgents(); 
    agentsListContainer.innerHTML = ''; 

    if (agents.length === 0) {
        agentsListContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                <h3>No agents yet</h3>
                <p>Create a custom agent to chat with</p>
                <button class="primary-btn" id="emptyCreateAgentBtn">Create Agent</button>
            </div>
        `;
        document.getElementById('emptyCreateAgentBtn')?.addEventListener('click', () => showAgentModal());
    } else {
        agents.forEach(agent => {
            const agentElement = document.createElement('div');
            agentElement.classList.add('agent-item');
            const promptPreview = agent.prompt.length > 100 ? agent.prompt.substring(0, 100) + '...' : agent.prompt;
            const knowledgeIndicator = agent.knowledge ? `<span class="knowledge-indicator" title="Has knowledge base">(Knowledge)</span>` : ''; 
            agentElement.innerHTML = `
                <div class="agent-info">
                    <h4>${agent.name} ${knowledgeIndicator}</h4>
                    <p>${promptPreview}</p>
                </div>
                <div class="agent-actions">
                    <button class="icon-btn edit-agent-btn" data-id="${agent.id}" title="Edit Agent">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-8"></path>
                            <path d="M18.4 13l.7.7a2 2 0 010 2.83L12 21"></path>
                            <line x1="18" y1="11" x2="12" y2="5"></line>
                        </svg>
                    </button>
                    <button class="icon-btn delete-agent-btn" data-id="${agent.id}" title="Delete Agent">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="12" y1="18" x2="12" y2="6"></line>
                            <path d="M4 7l1 13h14l1-13"></path>
                            <rect x="8" y="4" width="8" height="4" rx="1"></rect>
                        </svg>
                    </button>
                </div>
            `;
            agentsListContainer.appendChild(agentElement);
        });

        document.querySelectorAll('.edit-agent-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const agentId = parseInt(button.getAttribute('data-id'));
                const agent = await getAgent(agentId);
                if (agent) {
                    showAgentModal(agent);
                }
            });
        });
        document.querySelectorAll('.delete-agent-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const agentId = parseInt(button.getAttribute('data-id'));
                if (confirm('Are you sure you want to delete this agent?')) {
                    await deleteAgent(agentId);
                    sendSyncMessage('agent_update', { type: 'deleted', agent_id: agentId }); // Sync agent deletion
                    await renderAgentsList(); 
                    loadChatOptions(); 
                }
            });
        });
    }
}
export { renderAgentsList };

// --- Initialization ---
export function initializeAgentsUI() {
    if (createAgentBtn) {
        createAgentBtn.addEventListener('click', () => showAgentModal());
    }
    modalCloseBtns.forEach(btn => btn.addEventListener('click', hideAgentModal));
    modalOverlay.addEventListener('click', hideAgentModal);

    if (saveAgentBtn) {
        saveAgentBtn.addEventListener('click', saveAgent);
    }

    if (agentKnowledgeFileInput && knowledgeFileLabel) {
        agentKnowledgeFileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                if (knowledgeFileNameDisplay) {
                    knowledgeFileNameDisplay.textContent = `Selected: ${file.name}`;
                }
                await processFile(file); 
            } else {
                if (knowledgeFileNameDisplay) knowledgeFileNameDisplay.textContent = '';
                loadedFileContent = '';
                if (agentKnowledgeInput) agentKnowledgeInput.value = '';
            }
        });
    }
    
    renderAgentsList();
}
