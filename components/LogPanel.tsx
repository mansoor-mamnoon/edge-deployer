import React from "react";

interface LogEntry {
  timestamp: string;
  status: string;
  body: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
}

const LogPanel: React.FC<LogPanelProps> = ({ logs, setLogs }) => {
  return (

    <div className="panel">
  
    <div style={{ background: "#121212", padding: "10px", margin: "12px", borderRadius: "5px" }}>
      <h3 style={{ color: "#fff" }}>📡 API Logs</h3>
      <button
        onClick={() => setLogs([])}
        style={{ background: "#800", color: "#fff", padding: "5px", marginBottom: "10px", border: "none" }}
      >
        🧹 Clear Logs
      </button>
      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {logs.map((log, idx) => (
          <li
            key={idx}
            style={{
              marginBottom: "8px",
              background: "#222",
              padding: "10px",
              borderRadius: "4px",
              color: log.status === "200" ? "#4caf50" : "#f44336",
            }}
          >
            <strong>{log.timestamp}</strong> – Status: {log.status}
            <br />
            <code style={{ whiteSpace: "pre-wrap", color: "#ccc" }}>{log.body}</code>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
};

export default LogPanel;
