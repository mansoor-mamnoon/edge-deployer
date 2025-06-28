import { contextBridge, ipcRenderer } from "electron";
import { deployToSelectedCloud } from "./multiCloudDeployer"; // ✅ correct path

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
    return ipcRenderer.invoke("deploy-code", code);
  },
  deployToCloudflare: (code: string) => {
    return ipcRenderer.invoke("deploy-to-cloudflare", code);
  },
  deployToCloud: (code: string, config: any) => {
    console.log("🚀 deployToCloud called from renderer");
    return deployToSelectedCloud(code, config); // ✅ sync wrapper around async function
  },

  downloadPulumi: (config: any, code: string) => {
    return ipcRenderer.invoke("download-pulumi", config, code);
  },

  onDeployLog: (callback: (log: string) => void) => {
    ipcRenderer.on("deploy-log", (_event, log) => callback(log));
  },
  
});
