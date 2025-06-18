"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    saveFile: (code) => {
        console.log("💾 saveFile called");
        return electron_1.ipcRenderer.invoke("save-file", code);
    },
    openFile: () => {
        console.log("📂 openFile called from renderer");
        return electron_1.ipcRenderer.invoke("open-file");
    },
});
