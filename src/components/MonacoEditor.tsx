import * as monaco from "monaco-editor";
import React, { useEffect, useRef, useState } from "react";
import "monaco-editor/min/vs/editor/editor.main.css";

interface MonacoEditorProps {
  code: string;
  language: string;
  onChange?: (value: string) => void;
  setCode: (code: string) => void;
}

const MonacoEditor = ({ code, language, onChange, setCode }: MonacoEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null); // ✅ Bonus feature
  const [showToast, setShowToast] = useState(false);


  // Mount Monaco Editor
  useEffect(() => {
    if (editorRef.current) {
      monacoRef.current = monaco.editor.create(editorRef.current, {
        value: code,
        language: language,
        theme: "vs-dark",
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false },
      });

      monacoRef.current.onDidChangeModelContent(() => {
        if (onChange) {
          onChange(monacoRef.current!.getValue());
        }
      });
    }

    return () => {
      monacoRef.current?.dispose();
    };
  }, []);

  // Sync code updates from outside
  useEffect(() => {
    if (monacoRef.current && code !== monacoRef.current.getValue()) {
      monacoRef.current.setValue(code);
    }
  }, [code]);

  // Handle Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  
    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.name.endsWith(".js") ||
       file.name.endsWith(".ts") ||
       file.name.endsWith(".json"))
    ) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCode(text);
        setFileName(file.name);
  
        const extension = file.name.split(".").pop();
        let detectedLang = "javascript";
        if (extension === "ts") detectedLang = "typescript";
        else if (extension === "json") detectedLang = "json";

        
        monacoRef.current?.getModel()?.setValue(text);
        monaco.editor.setModelLanguage(monacoRef.current!.getModel()!, detectedLang);
  
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      };
      reader.readAsText(file);
    }
  };
  

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={{
        position: "relative", // ✅ Required for overlay
        height: "400px",
        width: "100%",
        border: isDragging ? "2px dashed #00d8ff" : "1px solid #444",
        margin: "12px 0",
        borderRadius: "5px",
        overflow: "hidden",
      }}
    >
      {/* ✅ Optional: Show filename above editor */}
      {fileName && (
        <div style={{ fontSize: "0.9rem", color: "#aaa", marginBottom: "4px" }}>
          🗂 {fileName}
        </div>
      )}

      {/* ✅ Drag overlay */}
      {isDragging && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            zIndex: 10,
          }}
        >
          📥 Drop your .js file here
        </div>
      )}

      {/* Editor mounts here */}
      <div ref={editorRef} id="editor-container" style={{ height: "100%", width: "100%" }} />

      {showToast && (
  <div
    style={{
      position: "absolute",
      bottom: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#323232",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "6px",
      fontSize: "0.9rem",
      zIndex: 11,
      boxShadow: "0px 2px 8px rgba(0,0,0,0.3)",
      transition: "opacity 0.3s ease",
    }}
  >
    ✅ File loaded: <strong>{fileName}</strong>
  </div>
)}

    </div>
  );
};

export default MonacoEditor;
