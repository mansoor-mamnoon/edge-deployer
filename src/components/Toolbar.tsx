import React from "react";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';


interface ToolbarProps {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  setIsDeploying: React.Dispatch<React.SetStateAction<boolean>>;
  setStatusClass: React.Dispatch<React.SetStateAction<string>>;
  setDeployUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setShowConfig: React.Dispatch<React.SetStateAction<boolean>>; // ✅ new line
}



declare global {
  interface Window {
    electronAPI: {
      saveFile: (code: string) => void;
      openFile: () => Promise<string | null>;
      deployCode: (code: string) => Promise<string>;
      deployToCloudflare: (code: string) => Promise<any>;
      deployToCloud: (code: string, config: any) => Promise<{ url: string }>; // ✅ Add this line
    };
  }
}


const DEFAULT_CODE = `addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
})

async function handleRequest(request) {
  return new Response("Hello from your deployed API!", {
    headers: { "Content-Type": "text/plain" },
  });
}`.trim();

const Toolbar = ({ code, setCode, setStatus, setIsDeploying, setStatusClass, setDeployUrl, setShowConfig }: ToolbarProps) => {

  const runCode = () => {
    const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(code, "*");
    }
  };

  const resetCode = () => {
    setCode(DEFAULT_CODE);
    const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(DEFAULT_CODE, "*");
    }
  };

  const handleDeploy = async () => {
    try {
      const filePath = await window.electronAPI.deployCode(code);
      console.log("\u{1F680} Deployed to:", filePath);
      setStatus("\u2705 File saved locally.");
    } catch (err) {
      console.error("\u274C Deployment failed:", err);
      setStatus("\u274C File deployment failed.");
    }
  };

  const handleMultiCloudDeploy = async () => {
    const config = JSON.parse(localStorage.getItem("envConfig") || "{}");
    setIsDeploying(true);
    setStatus(`🚀 Deploying to ${config.cloudProvider || "?"}...`);
    setStatusClass("");
  
    try {
      const res = await window.electronAPI.deployToCloud(code, config);
      console.log(`✅ Deploy Successful:`, res);
  
      setDeployUrl(res.url);
  
      const timestamp = new Date().toISOString();
      const newEntry = { scriptName: config.scriptName, timestamp, url: res.url };
      const existing = JSON.parse(localStorage.getItem("deployHistory") || "[]");
      existing.unshift(newEntry);
      localStorage.setItem("deployHistory", JSON.stringify(existing.slice(0, 5)));
  
      setTimeout(() => {
        setStatus("✅ Deploy successful!");
        setStatusClass("status-success");
      }, 800);
  
      window.open(res.url, "_blank");
    } catch (err) {
      console.error("❌ Deploy Failed:", err);
      setStatus("❌ Deploy failed. See console.");
      setStatusClass("status-error");
    } finally {
      setIsDeploying(false);
    }
  };
  

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    zip.file("index.js", code);  // adds your current editor code
  
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "edge-function.zip");

    setStatus("✅ ZIP created and downloaded.");
    setStatusClass("status-success");

  };
  

  return (
    <div style={{ display: "flex", gap: "10px", padding: "8px", background: "#1e1e1e" }}>
      <button className="toolbar-button" onClick={() => window.electronAPI.saveFile(code)}>💾 Save</button>
<button className="toolbar-button" onClick={runCode}>▶️ Run</button>
<button className="toolbar-button" onClick={handleDeploy}>🗂️ Save File</button>
<button className="toolbar-button" onClick={handleMultiCloudDeploy}>
  ☁️ Deploy to Selected Cloud
</button>


<button className="toolbar-button" onClick={handleDownloadZip}>
  📦 Download ZIP
</button>

<button className="toolbar-button" onClick={() => setShowConfig(true)}>
  ⚙️ Config
</button>


<button className="toolbar-button" onClick={async () => {
  const content = await window.electronAPI.openFile();
  if (content) setCode(content);
}}>
  📂 Open File
</button>
<button className="toolbar-button" onClick={resetCode}>🔄 Reset</button>

    </div>

    
  );
};

export default Toolbar;