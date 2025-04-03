const downloadBtn = document.getElementById('downloadBtn');
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const consoleOutput = document.getElementById('console');

let serverProcess = null;
let isWindows = navigator.platform.indexOf('Win') > -1;

// GitHub repository details
const repoUrl = 'https://github.com/yourusername/yourrepo';
const serverFiles = [
    'server/server.jar',
    'server/start.sh',
    'server/start.bat',
    'server/eula.txt'
];

downloadBtn.addEventListener('click', async () => {
    consoleOutput.innerHTML += '> Downloading server files...<br>';
    downloadBtn.disabled = true;
    
    try {
        // Create server directory
        await window.electron?.fs.promises.mkdir('server', { recursive: true });
        
        // Download each file
        for (const file of serverFiles) {
            const response = await fetch(`${repoUrl}/raw/main/${file}`);
            const data = await response.text();
            await window.electron?.fs.promises.writeFile(file, data);
            consoleOutput.innerHTML += `> Downloaded ${file}<br>`;
        }
        
        // Make start.sh executable on non-Windows
        if (!isWindows) {
            await window.electron?.childProcess.exec('chmod +x server/start.sh');
        }
        
        consoleOutput.innerHTML += '> Server files ready!<br>';
        runBtn.disabled = false;
    } catch (error) {
        consoleOutput.innerHTML += `> Error: ${error.message}<br>`;
        downloadBtn.disabled = false;
    }
});

runBtn.addEventListener('click', async () => {
    consoleOutput.innerHTML += '> Starting server...<br>';
    runBtn.disabled = true;
    stopBtn.disabled = false;
    
    try {
        const command = isWindows ? 'server\\start.bat' : './server/start.sh';
        serverProcess = window.electron?.childProcess.spawn(command, [], {
            cwd: process.cwd(),
            shell: true
        });
        
        serverProcess.stdout.on('data', (data) => {
            consoleOutput.innerHTML += data.toString() + '<br>';
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        });
        
        serverProcess.stderr.on('data', (data) => {
            consoleOutput.innerHTML += data.toString() + '<br>';
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        });
        
        serverProcess.on('close', () => {
            consoleOutput.innerHTML += '> Server stopped<br>';
            runBtn.disabled = false;
            stopBtn.disabled = true;
        });
    } catch (error) {
        consoleOutput.innerHTML += `> Error: ${error.message}<br>`;
        runBtn.disabled = false;
    }
});

stopBtn.addEventListener('click', () => {
    if (serverProcess) {
        consoleOutput.innerHTML += '> Stopping server...<br>';
        serverProcess.kill();
    }
});
