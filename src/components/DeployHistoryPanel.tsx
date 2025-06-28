import React from "react";

interface DeployEntry {
  scriptName: string;
  timestamp: string;
  cloudProvider: string;
  deployUrl: string;
}

const DeployHistoryPanel: React.FC = () => {
  const rawHistory = localStorage.getItem("deployHistory");
  const history: DeployEntry[] = rawHistory ? JSON.parse(rawHistory) : [];

  const recent = history.slice(-5).reverse(); // Get last 5, most recent first

  if (recent.length === 0) return null;

  return (
    <div className="panel" style={{ margin: "12px 0" }}>
      <h3>📦 Deploy History</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {recent.map((entry, index) => (
          <li key={index} style={{ marginBottom: "10px" }}>
            <strong>{entry.scriptName}</strong><br />
            <span style={{ fontSize: "0.85em" }}>
              {entry.timestamp} · {entry.cloudProvider} <br />
              <a href={entry.deployUrl} target="_blank" rel="noopener noreferrer">{entry.deployUrl}</a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DeployHistoryPanel;
