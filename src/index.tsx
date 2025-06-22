// Modularized version of your original UI
// Root: App.tsx

import React, { useState } from "react";
import Toolbar from "./components/Toolbar";
import DeploymentPanel from "./components/DeploymentPanel";
import TestPanel from "./components/TestPanel";
import LogPanel from "./components/LogPanel";
import MonacoEditor from "./components/MonacoEditor";
import "../public/index.css";
import ReactDOM from "react-dom/client";
import ConfigModal from "./components/ConfigModal";





const DEFAULT_CODE = `addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
})

async function handleRequest(request) {
  return new Response("Hello from your deployed API!", {
    headers: { "Content-Type": "text/plain" },
  });
}`.trim();

window.addEventListener("error", (e) => {
  if (e.message === "ResizeObserver loop completed with undelivered notifications.") {
    e.stopImmediatePropagation();
  }
});

// TypeScript interface for config
export interface EnvConfig {
  cloudProvider: 'cloudflare' | 'aws' | 'vercel'; // for future use
  apiKey: string;
  accountId: string;
  scriptName: string;
  envVars: Record<string, string>;
}



const App = () => {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [status, setStatus] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [requestInput, setRequestInput] = useState('');
  const [requestMethod, setRequestMethod] = useState<"GET" | "POST">("POST");
  const [showConfig, setShowConfig] = useState(false);

  
  

  return (
    <div className="app-container">
  
      {/* === Toolbar === */}
      <div className="panel row" style={{ alignItems: "center", justifyContent: "space-between" }}>
      <Toolbar
  code={code}
  setCode={setCode}
  setStatus={setStatus}
  setIsDeploying={setIsDeploying}
  setStatusClass={setStatusClass}
  setDeployUrl={setDeployUrl}
  setShowConfig={setShowConfig} 
/>


      </div>
  
      {/* === Editor + Deploy Panel Row === */}
      <div className="row" style={{ padding: "0 12px" }}>
        <div style={{ flex: 2 }}>
          <MonacoEditor code={code} language="javascript" onChange={setCode} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="panel">
            <DeploymentPanel
              status={status}
              isDeploying={isDeploying}
              deployUrl={deployUrl}
              statusClass={statusClass}
            />
          </div>
        </div>
      </div>
  
      {/* === Preview Output === */}
      <div className="panel" style={{ margin: "12px" }}>
        <h3>🧠 Preview Output</h3>
        <iframe
          id="preview-iframe"
          src="preview.html"
          title="Preview"
          className="preview-frame"
          style={{
            width: "100%",
            height: "200px",
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: "5px",
          }}
        ></iframe>
      </div>
  
      {/* === Test Panel + Logs === */}
      <div className="row">
        <div style={{ flex: 1 }}>
          <div className="panel">
            <TestPanel
              deployUrl={deployUrl}
              requestInput={requestInput}
              setRequestInput={setRequestInput}
              requestMethod={requestMethod}
              setRequestMethod={setRequestMethod}
              setLogs={setLogs}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="panel">
            <LogPanel logs={logs} setLogs={setLogs} />
          </div>
        </div>
      </div>

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}

    </div>
    
  );
  
};

export default App;

// ✅ Mount React App to #root
const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(<App />);
} else {
  console.error("❌ Could not find root element");
}