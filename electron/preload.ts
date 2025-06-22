// electron/preload.ts
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
  deployCode: (code: string) => {
    console.log("🚀 deployCode called from renderer");
    return ipcRenderer.invoke("deploy-code", code); // ✅ ADD THIS
  },

  deployToCloudflare: (code: string) =>
  ipcRenderer.invoke("deploy-to-cloudflare", code),

});


