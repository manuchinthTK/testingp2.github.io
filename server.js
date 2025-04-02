const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = 3000;
const SERVER_DIR = path.join(__dirname, 'minecraft-server');
const SERVER_JAR = 'server.jar';

// Create server directory if needed
if (!fs.existsSync(SERVER_DIR)) {
    fs.mkdirSync(SERVER_DIR, { recursive: true });
}

// Serve static files
app.use(express.static('public'));

// HTTP server
const server = app.listen(PORT, () => {
    console.log(`Web interface: http://localhost:${PORT}`);
    console.log(`Minecraft server: ${getCodespaceAddress()}:25565`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

let minecraftProcess = null;
let serverStatus = 'offline';
let players = [];

wss.on('connection', (ws) => {
    console.log('New client connected');
    sendStatus(ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleCommand(ws, data);
        } catch (err) {
            console.error('Error processing message:', err);
        }
    });
});

function handleCommand(ws, data) {
    switch(data.type) {
        case 'status':
            sendStatus(ws);
            break;
        case 'start':
            startServer(ws);
            break;
        case 'stop':
            stopServer();
            break;
        case 'command':
            if (minecraftProcess) {
                minecraftProcess.stdin.write(`${data.command}\n`);
            }
            break;
    }
}

async function startServer(ws) {
    if (serverStatus !== 'offline') return;
    
    serverStatus = 'starting';
    broadcastStatus();
    broadcastConsole('[System] Starting Minecraft server...');
    
    try {
        // Download server if needed
        if (!fs.existsSync(path.join(SERVER_DIR, SERVER_JAR))) {
            await downloadServer();
            broadcastConsole('[System] Downloaded Minecraft server');
        }
        
        // Accept EULA
        if (!fs.existsSync(path.join(SERVER_DIR, 'eula.txt'))) {
            fs.writeFileSync(path.join(SERVER_DIR, 'eula.txt'), 'eula=true\n');
            broadcastConsole('[System] Accepted EULA automatically');
        }
        
        // Start server process
        process.chdir(SERVER_DIR);
        minecraftProcess = spawn('java', [
            '-Xmx1024M',
            '-Xms1024M',
            '-jar', SERVER_JAR,
            'nogui'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });
        
        // Handle output
        minecraftProcess.stdout.on('data', (data) => {
            const output = data.toString();
            broadcastConsole(output);
            
            // Detect server ready
            if (output.includes('Done') && output.includes('help')) {
                serverStatus = 'online';
                broadcastStatus();
                broadcastConsole('[System] Server is now online!');
                broadcastConsole(`[System] Connect using: ${getCodespaceAddress()}:25565`);
            }
            
            // Track players
            if (output.includes('joined the game')) {
                const match = output.match(/: (\w+) joined the game/);
                if (match) {
                    players.push({
                        name: match[1],
                        joinTime: Date.now()
                    });
                    broadcastPlayers();
                }
            }
            
            if (output.includes('left the game')) {
                const match = output.match(/: (\w+) left the game/);
                if (match) {
                    players = players.filter(p => p.name !== match[1]);
                    broadcastPlayers();
                }
            }
        });
        
        minecraftProcess.stderr.on('data', (data) => {
            broadcastConsole(data.toString());
        });
        
        minecraftProcess.on('close', (code) => {
            broadcastConsole(`[System] Server stopped (code ${code})`);
            serverStatus = 'offline';
            players = [];
            minecraftProcess = null;
            broadcastStatus();
            broadcastPlayers();
        });
        
    } catch (err) {
        broadcastConsole(`[ERROR] ${err.message}`);
        serverStatus = 'offline';
        broadcastStatus();
    }
}

function stopServer() {
    if (minecraftProcess) {
        minecraftProcess.stdin.write('stop\n');
    }
}

async function downloadServer() {
    return new Promise((resolve, reject) => {
        const url = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', async () => {
                try {
                    const manifest = JSON.parse(data);
                    const latest = manifest.versions.find(v => v.type === 'release');
                    const versionDetails = await fetchJson(latest.url);
                    await downloadFile(versionDetails.downloads.server.url, path.join(SERVER_DIR, SERVER_JAR));
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlinkSync(dest);
            reject(err);
        });
    });
}

function getCodespaceName() {
    return process.env.CODESPACE_NAME || 'localhost';
}

function getCodespaceAddress() {
    return `${getCodespaceName()}-3000.githubpreview.dev`;
}

function sendStatus(ws) {
    ws.send(JSON.stringify({
        type: 'status',
        status: serverStatus,
        address: `${getCodespaceAddress()}:25565`
    }));
}

function broadcastStatus() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            sendStatus(client);
        }
    });
}

function broadcastConsole(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'console',
                message: message
            }));
        }
    });
}

function broadcastPlayers() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'players',
                players: players
            }));
        }
    });
}
