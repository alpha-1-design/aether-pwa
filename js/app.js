// Placeholder for Aether app main JavaScript file
console.log("Aether app.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    if (messageInput && sendBtn) {
        messageInput.addEventListener('input', () => {
            sendBtn.disabled = messageInput.value.trim() === '';
        });
        
        sendBtn.addEventListener('click', () => {
            const message = messageInput.value.trim();
            if (message) {
                console.log("Sending message:", message);
                messageInput.value = ''; // Clear input
                sendBtn.disabled = true;
            }
        });
    }

    // Initialize other components/views if needed
    // const agentsView = document.getElementById('agentsView');
    // if (agentsView) agentsView.style.display = 'none'; 
});