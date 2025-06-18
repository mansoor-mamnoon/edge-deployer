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


const App = () => {
  const [code, setCode] = useState(`export default {
    async fetch(request) {
      return new Response("Hello from your deployed API!", {
        headers: { "Content-Type": "text/plain" },
      });
    }
  };`.trim());

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      {/* Toolbar at the top */}
      <div style={{ display: "flex", gap: "10px", padding: "8px", background: "#1e1e1e" }}>
        <button onClick={() => window.electronAPI.saveFile(code)}>💾 Save</button>
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

      </div>

      {/* Code editor */}
      <div style={{ flexGrow: 1 }}>
        <MonacoEditor code={code} language="javascript" onChange={setCode} />
      </div>
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
