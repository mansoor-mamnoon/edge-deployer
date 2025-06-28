// components/DeployLogPanel.tsx
import React, { useEffect, useRef } from "react";

interface Props {
  logs: { message: string; type: string; timestamp: string }[];
}

const DeployLogPanel: React.FC<Props> = ({ logs }) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const getColor = (type: string) => {
    if (type === "success") return "#4caf50";
    if (type === "error") return "#f44336";
    if (type === "warning") return "#ffc107";
    return "#ccc";
  };

  return (
    <div
      className="panel"
      style={{
        background: "#111",
        fontFamily: "monospace",
        height: "200px",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        padding: "10px",
        borderRadius: "4px",
        marginTop: "12px",
      }}
      ref={logRef}
    >
      {logs.length === 0 ? (
        <div style={{ color: "#777" }}>📭 No logs yet</div>
      ) : (
        logs.map((log, idx) => (
          <div key={idx} style={{ color: getColor(log.type) }}>
            [{log.timestamp}] {log.message}
          </div>
        ))
      )}
    </div>
  );
};

export default DeployLogPanel;
