import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { SecretEntry } from '../src/types';

const VAULT_FILE = () => path.join(app.getPath('userData'), 'secrets.vault');
const ALGORITHM = 'aes-256-gcm';
const KEY_DERIVATION_ITERATIONS = 100_000;

// Derive a stable key from the machine ID (CPU + hostname) — zero user friction
function getMachineKey(): Buffer {
  const machineId = `${process.env.COMPUTERNAME || process.env.HOSTNAME || 'edge-deployer'}`;
  const salt = crypto.createHash('sha256').update('edge-deployer-salt-v1').digest();
  return crypto.pbkdf2Sync(machineId, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha256');
}

function encrypt(data: string): string {
  const key = getMachineKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12) + tag(16) + ciphertext, all base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(raw: string): string {
  const key = getMachineKey();
  const buf = Buffer.from(raw, 'base64');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const ciphertext = buf.slice(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

function readVault(): SecretEntry[] {
  const file = VAULT_FILE();
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return [];
    return JSON.parse(decrypt(raw)) as SecretEntry[];
  } catch {
    return [];
  }
}

function writeVault(entries: SecretEntry[]): void {
  const file = VAULT_FILE();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encrypt(JSON.stringify(entries)), 'utf8');
}

export function saveSecret(entry: SecretEntry): void {
  const entries = readVault().filter(e => e.key !== entry.key);
  entries.push({ ...entry, createdAt: entry.createdAt || new Date().toISOString() });
  writeVault(entries);
}

export function loadSecrets(): SecretEntry[] {
  return readVault();
}

export function deleteSecret(key: string): void {
  writeVault(readVault().filter(e => e.key !== key));
}

export function getSecret(key: string): string | undefined {
  return readVault().find(e => e.key === key)?.value;
}
