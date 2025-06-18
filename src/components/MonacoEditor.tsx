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

  // Initial mount
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

  // ✨ Update editor content if `code` changes externally (e.g. file open)
  useEffect(() => {
    if (monacoRef.current && code !== monacoRef.current.getValue()) {
      monacoRef.current.setValue(code);
    }
  }, [code]);

  return <div ref={editorRef} style={{ height: "100%", width: "100%" }} />;
};

export default MonacoEditor;
