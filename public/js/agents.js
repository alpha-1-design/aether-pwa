// Aether PWA - Agents Component
import { add, getAll, remove, put } from './store.js';

let appRef = null;
let agents = [];

export function initAgents(app) {
    appRef = app;
    loadAgents();
    bindEvents();
}

function bindEvents() {
    const createAgentBtn = document.getElementById('createAgentBtn');
    const emptyCreateAgentBtn = document.getElementById('emptyCreateAgentBtn');
    const saveAgentBtn = document.getElementById('saveAgentBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const agentModal = document.getElementById('agentModal');

    if (createAgentBtn) {
        createAgentBtn.addEventListener('click', () => openAgentModal());
    }

    if (emptyCreateAgentBtn) {
        emptyCreateAgentBtn.addEventListener('click', () => openAgentModal());
    }

    if (saveAgentBtn) {
        saveAgentBtn.addEventListener('click', saveAgent);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeAgentModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAgentModal();
        }
    });
}

async function loadAgents() {
    try {
        agents = await getAll('agents');
        renderAgents();
        updatePersonaSelect();
    } catch (error) {
        console.error('Failed to load agents:', error);
    }
}

function renderAgents() {
    const agentsList = document.getElementById('agentsList');
    if (!agentsList) return;

    if (!agents.length) {
        agentsList.innerHTML = `
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
        return;
    }

    agentsList.innerHTML = agents.map(agent => `
        <div class="agent-card" data-id="${agent.id}">
            <div class="agent-avatar">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            </div>
            <div class="agent-info">
                <h3 class="agent-name">${escapeHtml(agent.name)}</h3>
                <p class="agent-description">${escapeHtml(agent.description || 'Custom agent')}</p>
            </div>
            <div class="agent-actions">
                <button class="icon-btn" onclick="editAgent(${agent.id})" title="Edit">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="icon-btn" onclick="deleteAgent(${agent.id})" title="Delete">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    agentsList.querySelectorAll('.agent-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.icon-btn')) {
                selectAgent(parseInt(card.dataset.id));
            }
        });
    });
}

function updatePersonaSelect() {
    const select = document.getElementById('personaSelect');
    if (!select) return;

    let options = '<option value="default">Default</option>';
    
    agents.forEach(agent => {
        options += `<option value="${agent.id}">${escapeHtml(agent.name)}</option>`;
    });

    select.innerHTML = options;
}

function openAgentModal(agent = null) {
    const modal = document.getElementById('modalOverlay');
    const nameInput = document.getElementById('agentNameInput');
    const promptInput = document.getElementById('agentPromptInput');
    const knowledgeInput = document.getElementById('agentKnowledgeInput');

    if (agent) {
        nameInput.value = agent.name || '';
        promptInput.value = agent.systemPrompt || '';
        knowledgeInput.value = agent.knowledge || '';
        nameInput.dataset.editId = agent.id;
    } else {
        nameInput.value = '';
        promptInput.value = '';
        knowledgeInput.value = '';
        delete nameInput.dataset.editId;
    }

    modal.classList.remove('hidden');
    nameInput.focus();
}

function closeAgentModal() {
    const modal = document.getElementById('modalOverlay');
    modal.classList.add('hidden');
}

async function saveAgent() {
    const nameInput = document.getElementById('agentNameInput');
    const promptInput = document.getElementById('agentPromptInput');
    const knowledgeInput = document.getElementById('agentKnowledgeInput');

    const name = nameInput.value.trim();
    const systemPrompt = promptInput.value.trim();
    const knowledge = knowledgeInput.value.trim();

    if (!name) {
        alert('Please enter an agent name.');
        return;
    }

    const agent = {
        name: name,
        systemPrompt: systemPrompt,
        knowledge: knowledge,
        description: systemPrompt ? systemPrompt.substring(0, 100) + '...' : 'Custom agent',
        createdAt: new Date().toISOString(),
    };

    const editId = nameInput.dataset.editId;
    
    try {
        if (editId) {
            agent.id = parseInt(editId);
            await put('agents', agent);
        } else {
            await add('agents', agent);
        }

        closeAgentModal();
        loadAgents();
    } catch (error) {
        console.error('Failed to save agent:', error);
        alert('Failed to save agent. Please try again.');
    }
}

window.editAgent = function(id) {
    const agent = agents.find(a => a.id === id);
    if (agent) {
        openAgentModal(agent);
    }
};

window.deleteAgent = async function(id) {
    if (!confirm('Are you sure you want to delete this agent?')) {
        return;
    }

    try {
        await remove('agents', id);
        loadAgents();
    } catch (error) {
        console.error('Failed to delete agent:', error);
        alert('Failed to delete agent. Please try again.');
    }
};

function selectAgent(id) {
    const select = document.getElementById('personaSelect');
    if (select) {
        select.value = id.toString();
    }
    localStorage.setItem('aether_current_agent', id);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export default { initAgents };