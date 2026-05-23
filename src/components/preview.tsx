// 📄 src/components/Preview.tsx

import React, { useEffect, useState } from "react";

const Preview = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== "object" || event.data === null) return;

      if (event.data.type === "preview-started") {
        setLoading(true);
        setStatus(null);
        setError(null);
      } else if (event.data.type === "preview-success") {
        setLoading(false);
        setStatus(`✅ ${event.data.status || "200 OK"}`);
      } else if (event.data.type === "preview-error") {
        setLoading(false);
        setStatus("❌ Error");
        setError(event.data.message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div style={{ border: "1px solid #333", borderRadius: "8px", overflow: "hidden", position: "relative" }}>
      {loading && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          ⏳ Loading...
        </div>
      )}

      {status && (
        <div style={{
          padding: "4px 8px",
          backgroundColor: status.startsWith("✅") ? "#2e7d32" : "#c62828",
          color: "white",
          fontSize: "0.85rem"
        }}>
          {status}
        </div>
      )}

      {error && (
        <pre style={{
          backgroundColor: "#ffebee",
          color: "#b71c1c",
          padding: "8px",
          fontSize: "0.75rem",
          overflowX: "auto"
        }}>{error}</pre>
      )}

      <iframe
        id="preview-iframe"
        sandbox="allow-scripts"
        style={{ width: "100%", height: "300px", border: "none" }}
      ></iframe>
    </div>
  );
};

export default Preview;
