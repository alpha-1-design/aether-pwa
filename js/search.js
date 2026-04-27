const SEARCH_COMMAND = "/search";

function getBackendUrl() {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl;
    return '';
}

export function isSearchCommand(message) {
    return message.toLowerCase().trim().startsWith(SEARCH_COMMAND + " ");
}

export function extractSearchQuery(message) {
    const trimmed = message.trim();
    if (!trimmed.toLowerCase().startsWith(SEARCH_COMMAND + " ")) {
        return null;
    }
    return trimmed.slice(SEARCH_COMMAND.length + 1).trim();
}

export async function processSearchCommand(message) {
    const query = extractSearchQuery(message);
    if (!query) return false;

    try {
        const response = await fetch(`${getBackendUrl()}/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Search failed");
        
        const results = await response.json();
        return displaySearchResults(query, results);
    } catch (e) {
        console.error("Search error:", e);
        return displaySearchError(query, e.message);
    }
}

function displaySearchResults(query, results) {
    const messagesContainer = document.getElementById("messages");
    if (!messagesContainer) return false;

    const resultsHtml = `
        <div class="search-results">
            <div class="search-header">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <span>Search: ${escapeHtml(query)}</span>
            </div>
            <div class="search-list">
                ${(results.results || []).slice(0, 5).map(r => `
                    <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="search-result-item">
                        <div class="search-result-title">${escapeHtml(r.title || "Untitled")}</div>
                        <div class="search-result-snippet">${escapeHtml(r.snippet || "")}</div>
                    </a>
                `).join("")}
            </div>
            ${results.results?.length > 5 ? `<div class="search-more">+${results.results.length - 5} more results</div>` : ""}
        </div>
    `;

    const resultDiv = document.createElement("div");
    resultDiv.className = "message assistant-message search-message";
    resultDiv.innerHTML = resultsHtml;
    messagesContainer.appendChild(resultDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return true;
}

function displaySearchError(query, errorMessage) {
    const messagesContainer = document.getElementById("messages");
    if (!messagesContainer) return false;

    const errorHtml = `
        <div class="search-results search-error">
            <div class="search-header">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Search Failed</span>
            </div>
            <p>Could not search for "${escapeHtml(query)}"</p>
            <small>${escapeHtml(errorMessage)}</small>
        </div>
    `;

    const errorDiv = document.createElement("div");
    errorDiv.className = "message assistant-message search-message";
    errorDiv.innerHTML = errorHtml;
    messagesContainer.appendChild(errorDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return true;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

export { SEARCH_COMMAND };