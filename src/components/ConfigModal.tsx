import React, { useEffect, useState } from "react";
import { EnvConfig } from "../types";


const defaultConfig: EnvConfig = {
  cloudProvider: "cloudflare",
  apiKey: "",
  accountId: "",
  scriptName: "edge-deployer-script",
  envVars: {},
};

const ConfigModal = ({ onClose }: { onClose: () => void }) => {
  const [config, setConfig] = useState<EnvConfig>(() => {
    const saved = localStorage.getItem("envConfig");
    return saved ? JSON.parse(saved) : defaultConfig;
  });

  const update = (field: keyof EnvConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const save = () => {
    localStorage.setItem("envConfig", JSON.stringify(config));
    alert("✅ Config saved");
    onClose();
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#1e1e1e", padding: "20px", borderRadius: "8px", width: "400px" }}>
        <h2>⚙️ Environment Config</h2>
        <label>API Key</label>
        <input value={config.apiKey} onChange={e => update('apiKey', e.target.value)} style={{ width: "100%" }} />
        <label>Account ID</label>
        <input value={config.accountId} onChange={e => update('accountId', e.target.value)} style={{ width: "100%" }} />
        <label>Script Name</label>
        <input value={config.scriptName} onChange={e => update('scriptName', e.target.value)} style={{ width: "100%" }} />
        <br />
        <button onClick={save} className="toolbar-button">💾 Save</button>
        <button onClick={onClose} className="toolbar-button">❌ Cancel</button>
      </div>
    </div>
  );
};

export default ConfigModal;