import { app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { TelemetryLevel } from '../src/types';

const SETTINGS_FILE = path.join(app.getPath('userData'), 'telemetry.json');
const LOG_FILE = path.join(app.getPath('userData'), 'error-log.jsonl');

interface TelemetrySettings {
  level: TelemetryLevel;
  installId: string;
}

let _settings: TelemetrySettings | null = null;

function makeInstallId(): string {
  return 'ed_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function loadSettings(): Promise<TelemetrySettings> {
  if (_settings) return _settings;
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf8');
    _settings = JSON.parse(raw);
  } catch {
    _settings = { level: 'off', installId: makeInstallId() };
    await saveSettings(_settings);
  }
  return _settings!;
}

async function saveSettings(s: TelemetrySettings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(s, null, 2), 'utf8');
}

export async function getTelemetryLevel(): Promise<TelemetryLevel> {
  const s = await loadSettings();
  return s.level;
}

export async function setTelemetryLevel(level: TelemetryLevel): Promise<void> {
  const s = await loadSettings();
  s.level = level;
  await saveSettings(s);
}

export interface TelemetryEvent {
  type: 'error' | 'deploy' | 'feature';
  appVersion: string;
  platform: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// Records an event locally. If level >= 'errors' and type is 'error',
// also sends to the (non-existent) telemetry endpoint — which is a no-op
// until an endpoint is configured. This keeps the behavior transparent.
export async function recordEvent(
  type: TelemetryEvent['type'],
  payload: Record<string, unknown>
): Promise<void> {
  const s = await loadSettings();
  if (s.level === 'off') return;
  if (type !== 'error' && s.level === 'errors') return;

  const event: TelemetryEvent = {
    type,
    appVersion: app.getVersion(),
    platform: process.platform,
    timestamp: new Date().toISOString(),
    payload,
  };

  // Always write to local log first
  await fs.appendFile(LOG_FILE, JSON.stringify(event) + '\n', 'utf8').catch(() => {});

  // Sending is intentionally disabled until an endpoint is configured.
  // Uncomment and set TELEMETRY_ENDPOINT when ready:
  //
  // if (s.level !== 'off') {
  //   const endpoint = 'https://telemetry.your-domain.com/events';
  //   await fetch(endpoint, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ installId: s.installId, event }),
  //   }).catch(() => {});
  // }
}

export async function getLocalErrorLog(): Promise<TelemetryEvent[]> {
  try {
    const raw = await fs.readFile(LOG_FILE, 'utf8');
    return raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}
