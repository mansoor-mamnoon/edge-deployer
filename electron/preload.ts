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
    return ipcRenderer.invoke("deploy-code", code);
  },
  deployToCloudflare: (code: string) => {
    return ipcRenderer.invoke("deploy-to-cloudflare", code);
  },

  // ✅ Add this block here
  deployToCloud: async (code: string, config: any) => {
    console.log("🚀 deployToCloud called from renderer");
    const { deployToSelectedCloud } = await import("../multiCloudDeployer");
    return await deployToSelectedCloud(code, config);
  },
});
