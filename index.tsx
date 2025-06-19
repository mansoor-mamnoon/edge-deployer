import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import MonacoEditor from "./components/MonacoEditor";

export {};

declare global {
  interface Window {
    electronAPI: {
      saveFile: (code: string) => void;
      openFile: () => Promise<string | null>;
    };
  }
}

const DEFAULT_CODE = `export default {
  async fetch(request) {
    return new Response("Hello from your deployed API!", {
      headers: { "Content-Type": "text/plain" },
    });
  }
};`.trim();

const App = () => {
  const [code, setCode] = useState(DEFAULT_CODE);

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

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      {/* Toolbar at the top */}
      <div style={{ display: "flex", gap: "10px", padding: "8px", background: "#1e1e1e" }}>
        <button onClick={() => window.electronAPI.saveFile(code)}>💾 Save</button>
        <button onClick={runCode}>▶️ Run</button>
        <button
          onClick={async () => {
            console.log("📂 Open button clicked");
            const content = await window.electronAPI.openFile();
            console.log("📂 Received content:", content);
            if (content) setCode(content);
            else console.warn("📂 No content received!");
          }}
        >
          📂 Open
        </button>
        <button onClick={resetCode}>🔄 Reset</button>
      </div>

      {/* Deployment Panel */}
      <div className="deployment-panel" style={{ background: "#2c2c2c", padding: "10px", color: "#ccc" }}>
        <h3>🚀 Deployment Options</h3>
        <button disabled>Deploy to Cloudflare Workers (Coming Soon)</button>
        <button disabled style={{ marginLeft: "10px" }}>Deploy to AWS Lambda@Edge (Coming Soon)</button>
      </div>

      {/* Code editor */}
      <div style={{ flexGrow: 1 }}>
        <MonacoEditor code={code} language="javascript" onChange={setCode} />
      </div>

      {/* Preview Pane */}
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
