import * as monaco from "monaco-editor";
import React, { useEffect, useRef } from "react";

interface MonacoEditorProps {
  code: string;
  language: string;
  onChange?: (value: string) => void;
}

const MonacoEditor = ({ code, language, onChange }: MonacoEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      monacoRef.current = monaco.editor.create(editorRef.current, {
        value: code,
        language: language,
        automaticLayout: true,
        theme: "vs-dark",
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

  return <div ref={editorRef} style={{ height: "100vh", width: "100%" }} />;
};

export default MonacoEditor;
