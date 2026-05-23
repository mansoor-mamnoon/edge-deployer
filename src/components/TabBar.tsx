import React from 'react';
import { Tab } from '../types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onSelect, onClose, onNew }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#1a1a1a',
      borderBottom: '1px solid #333',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontFamily: 'monospace',
            borderRight: '1px solid #333',
            borderBottom: tab.id === activeTabId ? '2px solid #4af' : '2px solid transparent',
            background: tab.id === activeTabId ? '#1e1e1e' : 'transparent',
            color: tab.id === activeTabId ? '#fff' : '#888',
            transition: 'all 0.1s',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          <span>{tab.isDirty ? '● ' : ''}{tab.name}</span>
          {tabs.length > 1 && (
            <span
              onClick={e => { e.stopPropagation(); onClose(tab.id); }}
              style={{
                fontSize: '0.75rem',
                color: '#666',
                cursor: 'pointer',
                padding: '0 2px',
                borderRadius: 2,
                lineHeight: 1,
              }}
              title="Close tab"
            >
              ×
            </span>
          )}
        </div>
      ))}
      <button
        onClick={onNew}
        title="New tab"
        style={{
          background: 'none',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          padding: '6px 12px',
          fontSize: '1.1rem',
          lineHeight: 1,
        }}
      >
        +
      </button>
    </div>
  );
};

export default TabBar;
