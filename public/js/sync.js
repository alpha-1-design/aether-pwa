// Aether PWA - Cross-Device Sync Module
import { getSetting, saveSetting } from './store.js';

let appRef = null;
let ws = null;
let connectedDevices = [];
let deviceMode = 'off';
let deviceName = 'Device ' + Math.random().toString(36).substring(2, 6).toUpperCase();

const SYNC_PORT = 8765;

export function initSync(app) {
    appRef = app;
    bindEvents();
}

function bindEvents() {
    const showQrBtn = document.getElementById('showQrBtn');
    if (showQrBtn) {
        showQrBtn.addEventListener('click', showQRCode);
    }

    const joinDeviceBtn = document.getElementById('joinDeviceBtn');
    if (joinDeviceBtn) {
        joinDeviceBtn.addEventListener('click', joinDevice);
    }

    window.addEventListener('beforeunload', () => {
        disconnectAll();
    });
}

function showQRCode() {
    const container = document.getElementById('qrContainer');
    if (!container) return;

    const ip = document.getElementById('localIp').textContent;
    const url = `aether://connect/${ip}:${SYNC_PORT}`;

    container.innerHTML = `
        <div class="qr-code">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" 
                 alt="QR Code" 
                 style="width: 200px; height: 200px; border-radius: 8px;">
            <p>Scan to connect from another device</p>
            <p class="ip-text">${ip}:${SYNC_PORT}</p>
        </div>
    `;

    container.classList.remove('hidden');

    startHost();
}

function startHost() {
    if (ws) {
        ws.close();
    }

    try {
        ws = new WebSocket(`ws://localhost:${SYNC_PORT}`);

        ws.onopen = () => {
            console.log('Host started');
            broadcastDeviceList();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (e) {
                console.error('Invalid message:', e);
            }
        };

        ws.onclose = () => {
            console.log('Host closed');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    } catch (e) {
        console.error('Failed to start host:', e);
    }
}

function joinDevice() {
    const hostIp = document.getElementById('hostIpInput').value.trim();
    if (!hostIp) {
        alert('Please enter the host IP address.');
        return;
    }

    if (ws) {
        ws.close();
    }

    try {
        ws = new WebSocket(`ws://${hostIp}:${SYNC_PORT}`);

        ws.onopen = () => {
            console.log('Connected to host:', hostIp);
            sendMessage({
                type: 'join',
                name: deviceName,
            });
            updateConnectedDevicesUI();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (e) {
                console.error('Invalid message:', e);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from host');
            updateConnectedDevicesUI();
        };

        ws.onerror = (error) => {
            console.error('Connection error:', error);
            alert('Failed to connect. Check the IP address and try again.');
        };
    } catch (e) {
        console.error('Failed to connect:', e);
    }
}

function handleMessage(data) {
    switch (data.type) {
        case 'join':
            if (!connectedDevices.find(d => d.name === data.name)) {
                connectedDevices.push({
                    name: data.name,
                    connected: true,
                });
                broadcastDeviceList();
                updateConnectedDevicesUI();
            }
            break;

        case 'device_list':
            connectedDevices = data.devices;
            updateConnectedDevicesUI();
            break;

        case 'sync':
            handleSync(data);
            break;

        case 'disconnect':
            connectedDevices = connectedDevices.filter(d => d.name !== data.name);
            updateConnectedDevicesUI();
            break;
    }
}

function broadcastDeviceList() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
        type: 'device_list',
        devices: connectedDevices,
    }));
}

function updateConnectedDevicesUI() {
    const container = document.getElementById('connectedDevices');
    const list = document.getElementById('devicesList');

    if (!container || !list) return;

    connectedDevices = connectedDevices.filter(d => d.name !== deviceName);

    if (connectedDevices.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    list.innerHTML = connectedDevices.map(d => `
        <div class="device-item">
            <span class="device-status"></span>
            <span class="device-name">${d.name}</span>
        </div>
    `).join('');
}

function handleSync(data) {
    switch (data.action) {
        case 'sessions':
            if (data.content) {
                saveSetting('current_conversation', data.content);
            }
            break;

        case 'memory':
            if (data.content) {
                saveSetting('memory', data.content);
            }
            break;

        case 'agents':
            if (data.content) {
                saveSetting('agents', data.content);
            }
            break;
    }
}

function syncToDevices(action, content) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
        type: 'sync',
        action: action,
        content: content,
    }));
}

function disconnectAll() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'disconnect',
            name: deviceName,
        }));
        ws.close();
    }
    connectedDevices = [];
}

function getDeviceName() {
    return localStorage.getItem('aether_device_name') || deviceName;
}

function setDeviceName(name) {
    deviceName = name;
    localStorage.setItem('aether_device_name', name);
}

export default { initSync, syncToDevices };