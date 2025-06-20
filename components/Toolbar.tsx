import React from "react";

interface ToolbarProps {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  setIsDeploying: React.Dispatch<React.SetStateAction<boolean>>;
  setStatusClass: React.Dispatch<React.SetStateAction<string>>; // ✅ Make sure this is included
  setDeployUrl: React.Dispatch<React.SetStateAction<string | null>>;
}


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

const Toolbar = ({ code, setCode, setStatus, setIsDeploying, setStatusClass, setDeployUrl }: ToolbarProps) => {
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

  const handleCloudflareDeploy = async () => {
    setIsDeploying(true);
    setStatus("\u2601\uFE0F Deploying to Cloudflare...");
    setStatusClass("");

    try {
      const res = await window.electronAPI.deployToCloudflare(code);
      console.log("\u2705 Cloudflare Deploy Successful:", res);

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
        setStatus("\u2705 Deploy successful!");
        setStatusClass("status-success");
      }, 1000);

      window.open(url, "_blank");
    } catch (err) {
      console.error("\u274C Cloudflare Deploy Failed:", err);
      setStatus("\u274C Deploy failed. See console.");
      setStatusClass("status-error");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
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
  );
};

export default Toolbar;
