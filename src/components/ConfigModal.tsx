import React, { useState } from "react";
import { EnvConfig } from "../types";

const defaultConfig: EnvConfig = {
  cloudProvider: "cloudflare",
  cfApiToken: "",
  cfAccountId: "",
  cfScriptName: "",
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

  const renderCloudFields = () => {
    switch (config.cloudProvider) {
      case "cloudflare":
        return (
          <>
            <label>API Token</label>
            <input
              value={config.cfApiToken || ""}
              onChange={(e) => update("cfApiToken", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Account ID</label>
            <input
              value={config.cfAccountId || ""}
              onChange={(e) => update("cfAccountId", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Script Name</label>
            <input
              value={config.cfScriptName || ""}
              onChange={(e) => update("cfScriptName", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
          </>
        );
      case "aws":
        return (
          <>
            <label>Access Key ID</label>
            <input
              value={config.awsAccessKeyId || ""}
              onChange={(e) => update("awsAccessKeyId", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Secret Access Key</label>
            <input
              value={config.awsSecretAccessKey || ""}
              onChange={(e) => update("awsSecretAccessKey", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Region</label>
            <input
              value={config.awsRegion || ""}
              onChange={(e) => update("awsRegion", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Lambda Name</label>
            <input
              value={config.awsLambdaName || ""}
              onChange={(e) => update("awsLambdaName", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
          </>
        );
      case "vercel":
        return (
          <>
            <label>Vercel Token</label>
            <input
              value={config.vercelToken || ""}
              onChange={(e) => update("vercelToken", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Project ID</label>
            <input
              value={config.vercelProjectId || ""}
              onChange={(e) => update("vercelProjectId", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Team ID</label>
            <input
              value={config.vercelTeamId || ""}
              onChange={(e) => update("vercelTeamId", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#1e1e1e",
          padding: "20px",
          borderRadius: "8px",
          width: "400px",
        }}
      >
        <h2>⚙️ Environment Config</h2>

        <label>Cloud Provider</label>
        <select
          value={config.cloudProvider}
          onChange={(e) => update("cloudProvider", e.target.value as EnvConfig["cloudProvider"])}
          style={{ width: "100%", marginBottom: "10px" }}
        >
          <option value="cloudflare">Cloudflare</option>
          <option value="aws">AWS Lambda</option>
          <option value="vercel">Vercel</option>
        </select>

        {renderCloudFields()}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
          <button onClick={save} className="toolbar-button">💾 Save</button>
          <button onClick={onClose} className="toolbar-button">❌ Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
