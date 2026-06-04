const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    checkDependencies: () => ipcRenderer.invoke('api-check'),
    fetchMetadata: (url) => ipcRenderer.invoke('fetch-metadata', url),
    downloadVideo: (data) => ipcRenderer.invoke('download-video', data),
    onProgress: (callback) => ipcRenderer.on('download-progress', (event, value) => callback(value)),
    onInstallProgress: (callback) => ipcRenderer.on('install-progress', (event, msg) => callback(msg)),
    
    // Новые функции
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectCookies: () => ipcRenderer.invoke('select-cookies'),
    clearCookies: () => ipcRenderer.invoke('clear-cookies'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    getHistory: () => ipcRenderer.invoke('get-history')
});
