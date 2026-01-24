const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, ...args) => callback(...args)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, ...args) => callback(...args)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (event, ...args) => callback(...args)),
    restartApp: () => ipcRenderer.send('restart-app'),
    getVersion: () => process.versions.electron // or app version if exposed
});
