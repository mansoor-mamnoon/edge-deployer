import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (code: string) => {
    console.log("💾 saveFile called");
    return ipcRenderer.invoke("save-file", code);
  },
  openFile: () => {
    console.log("📂 openFile called from renderer");
    return ipcRenderer.invoke("open-file");
  },
});



