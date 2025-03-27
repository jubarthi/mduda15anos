const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onQrCode: (callback) => ipcRenderer.on('qr-code', (event, qr) => callback(qr))
});
