import React, { useState, useEffect } from 'react';
import { PluginManifest } from '../types';
import registry from '../../plugins/registry.json';

type RegistryPlugin = typeof registry.plugins[number];
type PanelTab = 'installed' | 'marketplace';

const CATEGORY_COLORS: Record<string, string> = {
  Security: '#f44',
  Observability: '#4af',
  Production: '#fa0',
  'Developer Experience': '#a4f',
  Integration: '#4f8',
  Default: '#555',
};

const PluginPanel: React.FC = () => {
  const [installed, setInstalled] = useState<PluginManifest[]>([]);
  const [tab, setTab] = useState<PanelTab>('installed');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [detail, setDetail] = useState<RegistryPlugin | null>(null);

  useEffect(() => {
    (window as any).electronAPI?.loadPlugins?.().then((p: PluginManifest[]) => {
      setInstalled(p ?? []);
    }).catch(() => setInstalled([]));
  }, []);

  const categories = ['All', ...Array.from(new Set(registry.plugins.map(p => p.category)))];

  const filteredMarketplace = registry.plugins.filter(p => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase()) &&
        !p.tags.some(t => t.includes(search.toLowerCase()))) return false;
    return true;
  });

  const isInstalled = (id: string) => installed.some(p => p.name === id || p.name.replace(/-/g, '') === id.replace(/-/g, ''));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#f5f5f5', fontSize: '0.83rem' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 12px 0', borderBottom: '1px solid #333' }}>
        {(['installed', 'marketplace'] as PanelTab[]).map(t => (
          <button key={t} className="toolbar-button" onClick={() => { setTab(t); setDetail(null); }}
            style={{ fontSize: '0.78rem', background: tab === t ? '#1a4a7a' : undefined, textTransform: 'capitalize', marginBottom: -1, borderBottom: tab === t ? '2px solid #4af' : 'none', borderRadius: '4px 4px 0 0' }}>
            {t}
            {t === 'installed' && installed.length > 0 && (
              <span style={{ marginLeft: 5, background: '#2a4a6a', borderRadius: 10, padding: '0 5px', fontSize: '0.68rem' }}>{installed.length}</span>
            )}
            {t === 'marketplace' && (
              <span style={{ marginLeft: 5, background: '#2a2a3a', borderRadius: 10, padding: '0 5px', fontSize: '0.68rem' }}>{registry.plugins.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'installed' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          {installed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ color: '#555', marginBottom: 12 }}>No plugins installed.</div>
              <div style={{ color: '#444', fontSize: '0.75rem', marginBottom: 16, lineHeight: 1.6 }}>
                Drop a plugin folder (containing <code style={{ color: '#888' }}>plugin.json</code> + <code style={{ color: '#888' }}>index.js</code>) into:<br />
                <code style={{ color: '#aaa' }}>~/Library/Application Support/edge-deployer/plugins/</code>
              </div>
              <button className="toolbar-button" onClick={() => setTab('marketplace')} style={{ fontSize: '0.8rem' }}>
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {installed.map(p => (
                <div key={p.name} style={{ background: '#1e1e1e', border: '1px solid #2a2a4a', borderRadius: 6, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: '0.72rem', color: '#4f4', background: '#1a3a1a', padding: '1px 7px', borderRadius: 10 }}>v{p.version} installed</span>
                  </div>
                  <div style={{ color: '#888', fontSize: '0.78rem', marginTop: 3 }}>{p.description}</div>
                  {p.permissions && p.permissions.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {p.permissions.map(perm => (
                        <span key={perm} style={{ background: '#2a1a1a', color: '#f84', fontSize: '0.68rem', padding: '1px 6px', borderRadius: 3 }}>
                          {perm}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: '0.75rem', color: '#555', background: '#1a1a1a', padding: '10px 12px', borderRadius: 6, border: '1px solid #2a2a2a' }}>
            <strong style={{ color: '#888' }}>Plugin hooks:</strong>{' '}
            <code style={{ color: '#4af' }}>onBeforeDeploy</code>,{' '}
            <code style={{ color: '#4af' }}>onAfterDeploy</code>,{' '}
            <code style={{ color: '#4af' }}>onCodeTransform</code>.{' '}
            See <a style={{ color: '#4af' }} href="#">docs/plugin-sdk.md</a>.
          </div>
        </div>
      )}

      {tab === 'marketplace' && !detail && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Search + filter */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #222' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search plugins..."
              style={{ width: '100%', background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '5px 8px', borderRadius: 4, fontSize: '0.8rem', boxSizing: 'border-box', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button key={cat} className="toolbar-button" onClick={() => setSelectedCategory(cat)}
                  style={{ fontSize: '0.7rem', padding: '2px 8px', background: selectedCategory === cat ? '#1a4a7a' : undefined }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Plugin grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredMarketplace.map(p => (
              <div key={p.id} onClick={() => setDetail(p)}
                style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '10px 14px', cursor: 'pointer', transition: 'border-color 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#3a3a5a')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      {p.builtin && <span style={{ background: '#2a2a2a', color: '#888', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 10 }}>built-in</span>}
                      {isInstalled(p.id) && <span style={{ background: '#1a3a1a', color: '#4f4', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 10 }}>installed</span>}
                    </div>
                    <div style={{ color: '#888', fontSize: '0.75rem', lineHeight: 1.4 }}>{p.description}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', background: CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.Default,
                        color: '#000', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>{p.category}</span>
                      {p.tags.slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: '0.65rem', color: '#555', background: '#222', padding: '1px 5px', borderRadius: 3 }}>#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>★ {p.stars}</div>
                    <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 2 }}>v{p.version}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'marketplace' && detail && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <button className="toolbar-button" onClick={() => setDetail(null)} style={{ marginBottom: 12, fontSize: '0.78rem', color: '#888' }}>
            ← Back
          </button>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{detail.name}</div>
          <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: 12 }}>v{detail.version} · by {detail.author} · ★ {detail.stars}</div>
          <div style={{ color: '#aaa', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 14 }}>{detail.description}</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: 6 }}>REQUIRED PERMISSIONS</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {detail.permissions.map(p => (
                <span key={p} style={{ background: '#2a1a1a', color: '#f84', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4 }}>{p}</span>
              ))}
            </div>
          </div>

          <div style={{ background: '#111', border: '1px solid #333', borderRadius: 6, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: 6 }}>INSTALL</div>
            <code style={{ color: '#4af', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{detail.install}</code>
          </div>

          {detail.source && (
            <button className="toolbar-button" onClick={() => (window as any).electronAPI?.openExternal?.(detail.source!)}
              style={{ fontSize: '0.8rem' }}>
              View source on GitHub →
            </button>
          )}
          {!detail.source && (
            <div style={{ color: '#555', fontSize: '0.75rem', fontStyle: 'italic' }}>
              {detail.builtin ? 'Built-in plugin — no external source.' : 'Community plugin — source not yet available.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PluginPanel;
