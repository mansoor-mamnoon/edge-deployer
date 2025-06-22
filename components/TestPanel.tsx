import React from "react";

interface TestPanelProps {
  requestInput: string;
  setRequestInput: (input: string) => void;
  deployUrl: string | null;
  requestMethod: "GET" | "POST";
  setRequestMethod: (method: "GET" | "POST") => void;
  setLogs: React.Dispatch<React.SetStateAction<any[]>>;
}

const TestPanel: React.FC<TestPanelProps> = ({
  requestInput,
  setRequestInput,
  deployUrl,
  requestMethod,
  setRequestMethod,
  setLogs,
}) => {
  const handleSendRequest = async () => {
    if (!deployUrl) return alert("Deploy your Worker first.");
    try {
      const res = await fetch(deployUrl, {
        method: requestMethod,
        ...(requestMethod === "POST" && { body: requestInput }),
      });

      const text = await res.text();
      const entry = {
        timestamp: new Date().toISOString(),
        status: res.status,
        body: text.slice(0, 200),
      };
      setLogs((prev) => [entry, ...prev].slice(0, 10));
    } catch (err: any) {
      setLogs((prev) => [
        {
          timestamp: new Date().toISOString(),
          status: "ERR",
          body: err.message,
        },
        ...prev,
      ].slice(0, 10));
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        background: "#1e1e1e",
        margin: "12px",
        borderRadius: "5px",
      }}
    >
      <h3 style={{ color: "#fff" }}>🔍 Test Deployed API</h3>
      <textarea
        value={requestInput}
        onChange={(e) => setRequestInput(e.target.value)}
        placeholder="Enter JSON or raw input..."
        style={{
          minHeight: "80px",
          marginBottom: "10px",
          padding: "10px",
          fontFamily: "monospace",
        }}
      />

      <div
        style={{
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <label htmlFor="method" style={{ color: "#ccc" }}>
          Method:
        </label>
        <select
  id="method"
  className="toolbar-button"
  value={requestMethod}
  onChange={(e) => setRequestMethod(e.target.value as "GET" | "POST")}
>

          <option value="POST">POST</option>
          <option value="GET">GET</option>
        </select>
      </div>

      <button
  className="toolbar-button"
  style={{ alignSelf: "flex-start", marginTop: "8px" }}
  onClick={handleSendRequest}
>
  🧪 Send Request
</button>

    </div>
  );
};

export default TestPanel;
