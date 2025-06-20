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
  const [statusClass, setStatusClass] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [requestInput, setRequestInput] = useState('');
  const [requestMethod, setRequestMethod] = useState<"GET" | "POST">("POST");
  
  

  return (
    <div className="app-container">
      <Toolbar
  code={code}
  setCode={setCode}
  setStatus={setStatus}
  setIsDeploying={setIsDeploying}
  setStatusClass={setStatusClass}
  setDeployUrl={setDeployUrl}
/>

<DeploymentPanel
  status={status}
  isDeploying={isDeploying}
  deployUrl={deployUrl}
  statusClass={statusClass}
/>



      <TestPanel
        deployUrl={deployUrl}
        requestInput={requestInput}
        setRequestInput={setRequestInput}
        requestMethod={requestMethod}
        setRequestMethod={setRequestMethod}
        setLogs={setLogs}
      />

      <LogPanel logs={logs} setLogs={setLogs} />

      <MonacoEditor code={code} language="javascript" onChange={setCode} />

      <iframe
        id="preview-iframe"
        src="preview.html"
        title="Preview"
        className="preview-frame"
      ></iframe>
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