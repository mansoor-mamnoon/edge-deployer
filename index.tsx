import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import MonacoEditor from "./components/MonacoEditor";
import "../public/index.css";


export {};

declare global {
  interface Window {
    electronAPI: {
      saveFile: (code: string) => void;
      openFile: () => Promise<string | null>;
      deployCode: (code: string) => Promise<string>;
      deployToCloudflare: (code: string) => Promise<any>;
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

const App = () => {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [status, setStatus] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);

  const runCode = () => {
    const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      console.log("📤 Sending code to preview iframe");
      iframe.contentWindow.postMessage(code, "*");
    } else {
      console.warn("❌ iframe not found or not ready");
    }
  };

  const resetCode = () => {
    console.log("🔄 Resetting editor to default code");
    setCode(DEFAULT_CODE);
    const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(DEFAULT_CODE, "*");
    }
  };

  const handleDeploy = async () => {
    try {
      const filePath = await window.electronAPI.deployCode(code);
      console.log("🚀 Deployed to:", filePath);
    } catch (err) {
      console.error("❌ Deployment failed:", err);
    }
  };

  const handleCloudflareDeploy = async () => {
    setIsDeploying(true);
    setStatus("Deploying to Cloudflare...");
    try {
      const res = await window.electronAPI.deployToCloudflare(code);
      console.log("✅ Cloudflare Deploy Successful:", res);
  
      localStorage.setItem("lastDeploy", JSON.stringify(res));
  
      const subdomain = "mansoormmamnoon";
      const scriptName = "edge-deployer-script";
      const url = `https://${scriptName}.${subdomain}.workers.dev`;
  
      setDeployUrl(url); // This is async-safe
      setStatus("✅ Deploy successful!");
      
      // ✅ Only open window AFTER setting the deploy URL
      window.open(url, "_blank");
  
    } catch (err) {
      console.error("❌ Cloudflare Deploy Failed:", err);
      setStatus("❌ Deploy failed. See console.");
    } finally {
      setIsDeploying(false);
    }
  };
  

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "10px", padding: "8px", background: "#1e1e1e" }}>
        <button onClick={() => window.electronAPI.saveFile(code)}>💾 Save</button>
        <button onClick={runCode}>▶️ Run</button>
        <button onClick={handleDeploy}>🚀 Deploy</button>
        <button onClick={handleCloudflareDeploy}>☁️ Deploy to Cloudflare</button>
        <button
          onClick={async () => {
            const content = await window.electronAPI.openFile();
            if (content) setCode(content);
          }}
        >
          📂 Open
        </button>
        <button onClick={resetCode}>🔄 Reset</button>
      </div>

      {/* Status & Spinner */}
      <div style={{ color: "#ccc", padding: "5px 10px", display: "flex", alignItems: "center" }}>
        {status}
        {isDeploying && <div className="loader" style={{ marginLeft: 10 }}></div>}
      </div>

      {/* Deployed Link */}
      {deployUrl && (
        <a
          href={deployUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#4af", marginLeft: "12px", padding: "5px 10px" }}
        >
          🔗 View Deployed Worker
        </a>
      )}

      {/* Editor */}
      <div style={{ flexGrow: 1 }}>
        <MonacoEditor code={code} language="javascript" onChange={setCode} />
      </div>

      {/* Preview */}
      <iframe
        id="preview-iframe"
        src="preview.html"
        style={{
          height: "200px",
          width: "100%",
          border: "1px solid #444",
          marginTop: "10px",
          background: "#1e1e1e",
          color: "#f5f5f5",
        }}
      ></iframe>
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
