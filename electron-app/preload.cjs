const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tetrisHost", {
  status: (status) => ipcRenderer.send("tetris:status", String(status)),
  log: (message) => ipcRenderer.send("tetris:log", String(message)),
  sendInput: (payload) => ipcRenderer.send("tetris:sendInput", payload)
});
