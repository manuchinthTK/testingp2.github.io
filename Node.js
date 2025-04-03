const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

let mcProcess;

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        // Handle commands from client
    });
    
    // Start Minecraft server when client connects
    mcProcess = spawn('java', ['-Xmx1024M', '-Xms1024M', '-jar', 'server.jar', 'nogui']);
    
    mcProcess.stdout.on('data', (data) => {
        ws.send(data.toString());
    });
    
    mcProcess.stderr.on('data', (data) => {
        ws.send(data.toString());
    });
    
    mcProcess.on('close', () => {
        ws.close();
    });
});

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});
