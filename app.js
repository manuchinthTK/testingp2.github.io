const downloadBtn = document.getElementById('downloadBtn');
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const consoleOutput = document.getElementById('console');

// GitHub repository details
const repoOwner = 'your-github-username';
const repoName = 'your-repo-name';
const serverJar = 'server-1.21.5.jar';

// WebSocket for live console updates
let socket;

downloadBtn.addEventListener('click', async () => {
    consoleOutput.innerHTML += '> Downloading Minecraft server...<br>';
    downloadBtn.disabled = true;
    
    try {
        // Fetch server.jar from GitHub
        const response = await fetch(`https://github.com/${repoOwner}/${repoName}/releases/latest/download/${serverJar}`);
        const blob = await response.blob();
        
        // Save file locally (simplified - in real app use proper download)
        consoleOutput.innerHTML += '> Server downloaded successfully!<br>';
        runBtn.disabled = false;
    } catch (error) {
        consoleOutput.innerHTML += `> Error: ${error.message}<br>`;
        downloadBtn.disabled = false;
    }
});

runBtn.addEventListener('click', () => {
    consoleOutput.innerHTML += '> Starting Minecraft server...<br>';
    runBtn.disabled = true;
    stopBtn.disabled = false;
    
    // Connect to WebSocket for live console
    socket = new WebSocket('wss://your-websocket-endpoint');
    
    socket.onmessage = (event) => {
        consoleOutput.innerHTML += event.data + '<br>';
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };
    
    socket.onclose = () => {
        consoleOutput.innerHTML += '> Server stopped<br>';
        runBtn.disabled = false;
        stopBtn.disabled = true;
    };
});

stopBtn.addEventListener('click', () => {
    if (socket) {
        socket.close();
    }
});
