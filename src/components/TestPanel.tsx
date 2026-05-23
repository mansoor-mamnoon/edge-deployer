import React, { useState, useRef, useEffect } from "react";

interface TestPanelProps {
  requestInput: string;
  setRequestInput: (input: string) => void;
  deployUrl: string | null;
  requestMethod: "GET" | "POST";
  setRequestMethod: (method: "GET" | "POST") => void;
  setLogs: React.Dispatch<React.SetStateAction<any[]>>;
}

type TestMode = "http" | "ws";

interface WsMessage {
  dir: "sent" | "received" | "system";
  text: string;
  ts: string;
}

const TestPanel: React.FC<TestPanelProps> = ({
  requestInput,
  setRequestInput,
  deployUrl,
  requestMethod,
  setRequestMethod,
  setLogs,
}) => {
  const [mode, setMode] = useState<TestMode>("http");
  const [httpResponse, setHttpResponse] = useState<{ status: number; body: string; ms: number } | null>(null);
  const [wsUrl, setWsUrl] = useState("");
  const [wsMsg, setWsMsg] = useState("");
  const [wsMessages, setWsMessages] = useState<WsMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const msgsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wsMessages]);

  // Pre-fill WS URL from deploy URL
  useEffect(() => {
    if (deployUrl && !wsUrl) {
      setWsUrl(deployUrl.replace(/^https?/, "wss").replace(/^http/, "ws"));
    }
  }, [deployUrl]);

  const handleHttpSend = async () => {
    if (!deployUrl) return alert("Deploy your Worker first.");
    const t0 = Date.now();
    try {
      const res = await fetch(deployUrl, {
        method: requestMethod,
        ...(requestMethod === "POST" && requestInput
          ? { body: requestInput, headers: { "Content-Type": "application/json" } }
          : {}),
      });
      const text = await res.text();
      const ms = Date.now() - t0;
      setHttpResponse({ status: res.status, body: text.slice(0, 2000), ms });
      setLogs((prev) =>
        [{ timestamp: new Date().toISOString(), status: res.status, body: text.slice(0, 200) }, ...prev].slice(0, 10)
      );
    } catch (err: any) {
      setHttpResponse({ status: 0, body: err.message, ms: Date.now() - t0 });
      setLogs((prev) =>
        [{ timestamp: new Date().toISOString(), status: "ERR", body: err.message }, ...prev].slice(0, 10)
      );
    }
  };

  const wsConnect = () => {
    if (!wsUrl) return;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setWsMessages(prev => [...prev, { dir: "system", text: `Connected to ${wsUrl}`, ts: now() }]);
      };
      ws.onmessage = (e) => {
        setWsMessages(prev => [...prev, { dir: "received", text: String(e.data), ts: now() }]);
      };
      ws.onclose = (e) => {
        setWsConnected(false);
        setWsMessages(prev => [...prev, { dir: "system", text: `Disconnected (code ${e.code})`, ts: now() }]);
        wsRef.current = null;
      };
      ws.onerror = () => {
        setWsMessages(prev => [...prev, { dir: "system", text: "Connection error", ts: now() }]);
      };
    } catch (e: any) {
      setWsMessages(prev => [...prev, { dir: "system", text: e.message, ts: now() }]);
    }
  };

  const wsDisconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
  };

  const wsSend = () => {
    if (!wsRef.current || !wsMsg.trim()) return;
    wsRef.current.send(wsMsg);
    setWsMessages(prev => [...prev, { dir: "sent", text: wsMsg, ts: now() }]);
    setWsMsg("");
  };

  const now = () => new Date().toLocaleTimeString();

  const statusColor = (s: number) => s >= 200 && s < 300 ? "#4f4" : s >= 400 ? "#f66" : "#fa0";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", gap: 10, boxSizing: "border-box" }}>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="toolbar-button"
          onClick={() => setMode("http")}
          style={{ background: mode === "http" ? "#1a4a7a" : undefined, fontSize: "0.78rem" }}>
          HTTP
        </button>
        <button className="toolbar-button"
          onClick={() => setMode("ws")}
          style={{ background: mode === "ws" ? "#1a4a7a" : undefined, fontSize: "0.78rem" }}>
          WebSocket
        </button>
      </div>

      {mode === "http" && (
        <>
          <h3 style={{ color: "#fff", margin: 0, fontSize: "0.9rem" }}>Test Deployed API</h3>
          <textarea
            value={requestInput}
            onChange={(e) => setRequestInput(e.target.value)}
            placeholder='Enter JSON or raw input... e.g. {"key":"value"}'
            style={{ minHeight: "70px", padding: "8px", fontFamily: "monospace", fontSize: "0.8rem", background: "#111", border: "1px solid #333", color: "#d4d4d4", borderRadius: 4, resize: "vertical" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ color: "#ccc", fontSize: "0.8rem" }}>Method:</label>
            <select className="toolbar-button" value={requestMethod}
              onChange={(e) => setRequestMethod(e.target.value as "GET" | "POST")}
              style={{ fontSize: "0.78rem" }}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            <button className="toolbar-button" onClick={handleHttpSend}
              style={{ background: "#1a3a1a", border: "1px solid #2a6a2a", color: "#4f4" }}>
              Send Request
            </button>
          </div>

          {httpResponse && (
            <div style={{ flex: 1, overflowY: "auto", background: "#111", border: "1px solid #333", borderRadius: 4, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: "0.78rem" }}>
                <span style={{ color: statusColor(httpResponse.status), fontWeight: 700 }}>
                  {httpResponse.status === 0 ? "ERR" : `${httpResponse.status}`}
                </span>
                <span style={{ color: "#555" }}>{httpResponse.ms}ms</span>
              </div>
              <pre style={{ margin: 0, color: "#d4d4d4", fontFamily: "monospace", fontSize: "0.78rem", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {(() => { try { return JSON.stringify(JSON.parse(httpResponse.body), null, 2); } catch { return httpResponse.body; } })()}
              </pre>
            </div>
          )}
        </>
      )}

      {mode === "ws" && (
        <>
          <h3 style={{ color: "#fff", margin: 0, fontSize: "0.9rem" }}>WebSocket Tester</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={wsUrl}
              onChange={e => setWsUrl(e.target.value)}
              placeholder="wss://your-worker.workers.dev/ws"
              style={{ flex: 1, background: "#111", border: "1px solid #333", color: "#fff", padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: "0.78rem" }}
            />
            {wsConnected ? (
              <button className="toolbar-button" onClick={wsDisconnect}
                style={{ background: "#3a1a1a", border: "1px solid #6a2a2a", color: "#f66" }}>
                Disconnect
              </button>
            ) : (
              <button className="toolbar-button" onClick={wsConnect}
                style={{ background: "#1a3a1a", border: "1px solid #2a6a2a", color: "#4f4" }}>
                Connect
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: wsConnected ? "#4f4" : "#555", flexShrink: 0 }} />
            <span style={{ color: wsConnected ? "#4f4" : "#555", fontSize: "0.75rem" }}>
              {wsConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Message log */}
          <div style={{ flex: 1, overflowY: "auto", background: "#111", border: "1px solid #333", borderRadius: 4, padding: "8px 10px", fontFamily: "monospace", fontSize: "0.75rem" }}>
            {wsMessages.length === 0 && (
              <span style={{ color: "#444" }}>Connect to a WebSocket endpoint to begin.</span>
            )}
            {wsMessages.map((m, i) => (
              <div key={i} style={{ marginBottom: 4, color: m.dir === "received" ? "#6af" : m.dir === "sent" ? "#4f4" : "#555" }}>
                <span style={{ color: "#444" }}>[{m.ts}]</span>{" "}
                <span style={{ color: m.dir === "received" ? "#555" : m.dir === "sent" ? "#555" : "#333" }}>
                  {m.dir === "received" ? "← " : m.dir === "sent" ? "→ " : "  "}
                </span>
                {m.text}
              </div>
            ))}
            <div ref={msgsEndRef} />
          </div>

          {/* Send input */}
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={wsMsg}
              onChange={e => setWsMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); wsSend(); } }}
              placeholder='Send a message... (Enter to send)'
              disabled={!wsConnected}
              style={{ flex: 1, background: "#111", border: `1px solid ${wsConnected ? "#333" : "#222"}`, color: wsConnected ? "#fff" : "#444",
                padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: "0.78rem" }}
            />
            <button className="toolbar-button" onClick={wsSend} disabled={!wsConnected}
              style={{ opacity: wsConnected ? 1 : 0.4 }}>
              Send
            </button>
          </div>
          {wsMessages.length > 0 && (
            <button className="toolbar-button" onClick={() => setWsMessages([])}
              style={{ alignSelf: "flex-start", fontSize: "0.72rem", color: "#555" }}>
              Clear log
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TestPanel;
