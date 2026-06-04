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
    getHistory: () => ipcRenderer.invoke('get-history'),
    getVersion: () => ipcRenderer.invoke('get-version'),
    toggleAutoUpdate: (val) => ipcRenderer.invoke('toggle-auto-update', val),
    checkUpdates: () => ipcRenderer.invoke('check-updates'),
    expandWindow: () => ipcRenderer.invoke('expand-window')
});
