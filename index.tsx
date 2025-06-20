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

// ✅ Default Worker code shown in editor
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
  const [statusClass, setStatusClass] = useState("");

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
      console.log("🚀 Deployed to:", filePath);
      setStatus("✅ File saved locally.");
    } catch (err) {
      console.error("❌ Deployment failed:", err);
      setStatus("❌ File deployment failed.");
    }
  };

  const handleCloudflareDeploy = async () => {
    setIsDeploying(true);
    setStatus("☁️ Deploying to Cloudflare...");
    setStatusClass("");

    try {
      const res = await window.electronAPI.deployToCloudflare(code);
      console.log("✅ Cloudflare Deploy Successful:", res);

      const subdomain = "mansoormmamnoon";
      const scriptName = "edge-deployer-script";
      const url = `https://${scriptName}.${subdomain}.workers.dev`;
      setDeployUrl(url);

      const timestamp = new Date().toISOString();
      const newEntry = { scriptName, timestamp, url };
      const existing = JSON.parse(localStorage.getItem("deployHistory") || "[]");
      existing.unshift(newEntry);
      localStorage.setItem("deployHistory", JSON.stringify(existing.slice(0, 5)));

      setTimeout(() => {
        setStatus("✅ Deploy successful!");
        setStatusClass("status-success");
      }, 1000);

      window.open(url, "_blank");
    } catch (err) {
      console.error("❌ Cloudflare Deploy Failed:", err);
      setStatus("❌ Deploy failed. See console.");
      setStatusClass("status-error");
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
        <button onClick={handleDeploy}>🗂️ Save File</button>
        <button onClick={handleCloudflareDeploy}>☁️ Deploy to Cloudflare</button>
        <button
          onClick={async () => {
            const content = await window.electronAPI.openFile();
            if (content) setCode(content);
          }}
        >
          📂 Open File
        </button>
        <button onClick={resetCode}>🔄 Reset</button>
      </div>

      {/* Status + Spinner */}
      <div className={statusClass} style={{ color: "#ccc", padding: "5px 10px", display: "flex", alignItems: "center" }}>
        {status}
        {isDeploying && <div className="loader" style={{ marginLeft: 10 }}></div>}
      </div>

      {/* Link to deployed Cloudflare Worker */}
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

      {/* Deployment History */}
      <div
        style={{
          marginTop: "10px",
          background: "#1c1c1c",
          padding: "10px",
          border: "1px solid #333",
          borderRadius: "5px",
          marginLeft: "12px",
          marginRight: "12px",
          color: "#eee",
        }}
      >
        <h3 style={{ marginTop: 0 }}>📜 Deployment History</h3>
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {JSON.parse(localStorage.getItem("deployHistory") || "[]").map((entry: any, index: number) => (
            <li key={index} style={{ marginBottom: "6px" }}>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#4af", textDecoration: "none" }}
              >
                🔗 {entry.scriptName} @{" "}
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </a>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            localStorage.removeItem("deployHistory");
            window.location.reload();
          }}
          style={{
            marginTop: "10px",
            background: "#800",
            color: "#fff",
            border: "none",
            padding: "6px 10px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🧹 Clear Deployment History
        </button>
      </div>

      {/* Monaco Editor */}
      <div style={{ flexGrow: 1 }}>
        <MonacoEditor code={code} language="javascript" onChange={setCode} />
      </div>

      {/* Preview iframe */}
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
