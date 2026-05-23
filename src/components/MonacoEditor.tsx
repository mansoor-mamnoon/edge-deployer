import * as monaco from 'monaco-editor';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'monaco-editor/min/vs/editor/editor.main.css';

interface MonacoEditorProps {
  code: string;
  language: string;
  setCode: (code: string) => void;
  onHotReload?: (code: string) => void;
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ code, language, setCode, onHotReload }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showToast, setShowToast] = useState('');
  const suppressSync = useRef(false);

  // Debounced hot-reload: send to preview iframe 400ms after last keystroke
  const hotReload = useCallback(
    debounce((c: string) => {
      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
      iframe?.contentWindow?.postMessage({ type: 'run-code', code: c }, '*');
      onHotReload?.(c);
    }, 400),
    [onHotReload]
  );

  // Mount editor once
  useEffect(() => {
    if (!editorRef.current) return;

    monacoRef.current = monaco.editor.create(editorRef.current, {
      value: code,
      language,
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      renderLineHighlight: 'gutter',
      bracketPairColorization: { enabled: true },
      wordWrap: 'off',
      tabSize: 2,
      formatOnPaste: true,
      suggestOnTriggerCharacters: true,
    });

    monacoRef.current.onDidChangeModelContent(() => {
      const val = monacoRef.current!.getValue();
      suppressSync.current = true;
      setCode(val);
      hotReload(val);
      requestAnimationFrame(() => { suppressSync.current = false; });
    });

    return () => { monacoRef.current?.dispose(); };
  }, []);

  // Sync external code changes (tab switch, reset, template load)
  useEffect(() => {
    if (monacoRef.current && !suppressSync.current && code !== monacoRef.current.getValue()) {
      const pos = monacoRef.current.getPosition();
      monacoRef.current.setValue(code);
      if (pos) monacoRef.current.setPosition(pos);
    }
  }, [code]);

  // Sync language changes
  useEffect(() => {
    const model = monacoRef.current?.getModel();
    if (model) monaco.editor.setModelLanguage(model, language);
  }, [language]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const validExts = ['js', 'ts', 'mjs', 'json', 'txt'];
    if (!validExts.includes(ext)) {
      setShowToast(`Unsupported file type: .${ext}`);
      setTimeout(() => setShowToast(''), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCode(text);
      setFileName(file.name);

      const langMap: Record<string, string> = { ts: 'typescript', json: 'json' };
      const lang = langMap[ext] ?? 'javascript';
      monacoRef.current?.getModel()?.setValue(text);
      monaco.editor.setModelLanguage(monacoRef.current!.getModel()!, lang);

      setShowToast(`Loaded: ${file.name}`);
      setTimeout(() => setShowToast(''), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        height: '420px',
        width: '100%',
        border: isDragging ? '2px dashed #4af' : '1px solid #333',
        borderRadius: '5px',
        overflow: 'hidden',
        background: '#1e1e1e',
      }}
    >
      {fileName && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, padding: '2px 10px', background: '#252526', fontSize: '0.78rem', color: '#aaa', borderBottom: '1px solid #333' }}>
          {fileName}
        </div>
      )}

      {isDragging && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,136,255,0.12)',
          border: '2px dashed #4af',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', color: '#4af', zIndex: 10,
        }}>
          Drop .js / .ts / .json file here
        </div>
      )}

      <div
        ref={editorRef}
        style={{
          height: '100%',
          width: '100%',
          paddingTop: fileName ? '22px' : 0,
          boxSizing: 'border-box',
        }}
      />

      {showToast && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          background: '#323232', color: '#fff', padding: '8px 16px',
          borderRadius: 6, fontSize: '0.82rem', zIndex: 11,
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          {showToast}
        </div>
      )}
    </div>
  );
};

export default MonacoEditor;
