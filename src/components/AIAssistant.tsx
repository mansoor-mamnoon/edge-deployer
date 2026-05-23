import React, { useState, useRef, useEffect } from 'react';
import { AIMessage } from '../types';

interface AIAssistantProps {
  code: string;
  onInsertCode?: (code: string) => void;
}

const PROMPTS = [
  'Explain what this code does',
  'Find bugs in this code',
  'Add error handling',
  'Convert to a JSON API',
  'Add CORS headers',
  'Add JWT authentication',
  'Optimize for cold starts',
  'Generate a rate limiter',
];

const AIAssistant: React.FC<AIAssistantProps> = ({ code, onInsertCode }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Try to load API key from secrets vault
    (window as any).electronAPI?.loadSecrets?.().then((secrets: any[]) => {
      const key = secrets?.find(s => s.key === 'ANTHROPIC_API_KEY');
      if (key) setApiKey(key.value);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (content?: string) => {
    const text = content ?? input.trim();
    if (!text || loading) return;

    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    const userMsg: AIMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const reply = await (window as any).electronAPI.aiAssist(next, code, apiKey);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const extractCode = (text: string): string | null => {
    const match = text.match(/```(?:javascript|js|typescript|ts)?\n([\s\S]+?)```/);
    return match ? match[1].trim() : null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#f5f5f5' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>AI Assistant</span>
        <button
          className="toolbar-button"
          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
          onClick={() => setShowKeyInput(v => !v)}
        >
          {apiKey ? 'Key set' : 'Set API Key'}
        </button>
      </div>

      {showKeyInput && (
        <div style={{ padding: '10px 14px', background: '#2a2a2a', borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
            Anthropic API key (stored encrypted in the secrets vault):
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              style={{ flex: 1, background: '#1e1e1e', border: '1px solid #444', color: '#fff', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
            <button
              className="toolbar-button"
              style={{ padding: '4px 10px' }}
              onClick={async () => {
                await (window as any).electronAPI?.saveSecret?.({
                  key: 'ANTHROPIC_API_KEY',
                  value: apiKey,
                  scope: 'global',
                  createdAt: new Date().toISOString(),
                });
                setShowKeyInput(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: 8 }}>Quick prompts:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PROMPTS.map(p => (
              <button
                key={p}
                className="toolbar-button"
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                onClick={() => send(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '90%',
                padding: '8px 12px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? '#1a4a7a' : '#2a2a2a',
                fontSize: '0.83rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
              }}
            >
              {msg.content}
              {msg.role === 'assistant' && extractCode(msg.content) && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="toolbar-button"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                    onClick={() => onInsertCode?.(extractCode(msg.content)!)}
                  >
                    Insert into editor
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: '#666', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
          </div>
        )}
        {error && (
          <div style={{ color: '#f44', fontSize: '0.8rem', padding: '6px 10px', background: '#2a1111', borderRadius: 4 }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #333', display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about your code... (Enter to send, Shift+Enter for newline)"
          rows={2}
          style={{
            flex: 1,
            background: '#1e1e1e',
            border: '1px solid #444',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 4,
            resize: 'none',
            fontFamily: 'monospace',
            fontSize: '0.82rem',
          }}
        />
        <button
          className="toolbar-button"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{ alignSelf: 'flex-end', padding: '6px 14px' }}
        >
          Send
        </button>
      </div>

      {messages.length > 0 && (
        <div style={{ padding: '4px 14px 8px', textAlign: 'right' }}>
          <button
            className="toolbar-button"
            style={{ fontSize: '0.72rem', padding: '2px 8px', color: '#666' }}
            onClick={() => setMessages([])}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
