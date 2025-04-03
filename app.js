const downloadBtn = document.getElementById('downloadBtn');
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const consoleOutput = document.getElementById('console');

// GitHub Pages URL for the server.jar
const serverJarUrl = window.location.origin + '/server.jar';

downloadBtn.addEventListener('click', async () => {
    consoleOutput.innerHTML += '> Downloading Minecraft server...<br>';
    downloadBtn.disabled = true;
    
    try {
        // Create a hidden anchor tag to trigger download
        const a = document.createElement('a');
        a.href = serverJarUrl;
        a.download = 'server-1.21.5.jar';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        consoleOutput.innerHTML += '> Server downloaded! Run the server when ready.<br>';
        runBtn.disabled = false;
    } catch (error) {
        consoleOutput.innerHTML += `> Error: ${error.message}<br>`;
        downloadBtn.disabled = false;
    }
});

// Note: The actual server execution would need to happen client-side
// or through a separate service, as GitHub Pages is static hosting
runBtn.addEventListener('click', () => {
    consoleOutput.innerHTML += '> Note: GitHub Pages cannot run servers directly.<br>';
    consoleOutput.innerHTML += '> Please download and run the server on your local machine.<br>';
});
