import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import MonacoEditor from "./components/MonacoEditor";

const App = () => {
    const [code, setCode] = useState(`export default {
        async fetch(request) {
          return new Response("Hello from your deployed API!", {
            headers: { "Content-Type": "text/plain" },
          });
        }
      };
      `.trim());
      

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <MonacoEditor code={code} language="javascript" onChange={setCode} />
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}


