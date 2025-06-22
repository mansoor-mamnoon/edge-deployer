import * as monaco from "monaco-editor";
import React, { useEffect, useRef } from "react";
import "monaco-editor/min/vs/editor/editor.main.css"; // ✅ Required to render styles

interface MonacoEditorProps {
  code: string;
  language: string;
  onChange?: (value: string) => void;
}

const MonacoEditor = ({ code, language, onChange }: MonacoEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Mount Monaco
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

  // Update externally changed code
  useEffect(() => {
    if (monacoRef.current && code !== monacoRef.current.getValue()) {
      monacoRef.current.setValue(code);
    }
  }, [code]);

  return (
    <div
      ref={editorRef}
      style={{
        height: "400px",        // ✅ Fixed height ensures visibility
        width: "100%",
        border: "1px solid #444",
        margin: "12px 0",
        borderRadius: "5px",
        overflow: "hidden",
      }}
    />
  );
};

export default MonacoEditor;
