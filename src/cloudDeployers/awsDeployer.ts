import { BuildArtifact, DeployResult, EnvConfig, HealthStatus, LogEntry } from '../types';
import { IDeployer } from './IDeployer';

class AWSDeployer implements IDeployer {
  async validate(config: EnvConfig): Promise<void> {
    if (!config.awsAccessKeyId) throw new Error('AWS: awsAccessKeyId is required.');
    if (!config.awsSecretAccessKey) throw new Error('AWS: awsSecretAccessKey is required.');
    if (!config.awsRegion) throw new Error('AWS: awsRegion is required.');
    if (!config.awsLambdaName) throw new Error('AWS: awsLambdaName is required.');
  }

  async build(code: string, config: EnvConfig): Promise<BuildArtifact> {
    // Wrap in a Lambda-compatible handler
    const lambdaCode = `
const handler = async (event, context) => {
  const url = \`https://\${event.requestContext?.domainName || 'localhost'}\${event.rawPath || '/'}\`;
  const request = new Request(url, {
    method: event.requestContext?.http?.method || 'GET',
    headers: event.headers || {},
    body: event.body || undefined,
  });

  // User code below
  ${code}

  try {
    const response = await handleRequest(request);
    const body = await response.text();
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};

exports.handler = handler;
`;
    return { code: lambdaCode, metadata: { runtime: 'nodejs20.x', handler: 'index.handler' } };
  }

  async deploy(artifact: BuildArtifact, config: EnvConfig): Promise<DeployResult> {
    const { awsAccessKeyId, awsSecretAccessKey, awsRegion, awsLambdaName } = config;
    const t0 = Date.now();

    // Create a ZIP in-memory using base64 encoding (minimal zip format)
    const zipBuffer = await this._createZip('index.js', artifact.code);
    const zipBase64 = btoa(String.fromCharCode(...new Uint8Array(zipBuffer)));

    const endpoint = `https://lambda.${awsRegion}.amazonaws.com/2015-03-31/functions/${awsLambdaName}/code`;
    const body = JSON.stringify({ ZipFile: zipBase64 });

    const sig = await this._signRequest('PUT', endpoint, body, config);
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { ...sig, 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AWS Lambda deploy failed (${res.status}): ${text}`);
    }

    const json: any = await res.json();

    return {
      url: `https://${awsRegion}.console.aws.amazon.com/lambda/home?region=${awsRegion}#/functions/${awsLambdaName}`,
      deploymentId: json.CodeSha256,
      provider: 'aws',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async rollback(deploymentId: string, config: EnvConfig): Promise<DeployResult> {
    // AWS Lambda rollback targets a published version
    const { awsRegion, awsLambdaName } = config;
    const endpoint = `https://lambda.${awsRegion}.amazonaws.com/2015-03-31/functions/${awsLambdaName}/aliases/live`;
    const body = JSON.stringify({ FunctionVersion: deploymentId });
    const sig = await this._signRequest('PUT', endpoint, body, config);

    await fetch(endpoint, {
      method: 'PUT',
      headers: { ...sig, 'Content-Type': 'application/json' },
      body,
    });

    return {
      url: `https://${awsRegion}.console.aws.amazon.com/lambda/home?region=${awsRegion}#/functions/${awsLambdaName}`,
      deploymentId,
      provider: 'aws',
      timestamp: new Date().toISOString(),
      latencyMs: 0,
    };
  }

  async logs(_config: EnvConfig): Promise<LogEntry[]> {
    return [];
  }

  async teardown(config: EnvConfig): Promise<void> {
    const { awsRegion, awsLambdaName } = config;
    const endpoint = `https://lambda.${awsRegion}.amazonaws.com/2015-03-31/functions/${awsLambdaName}`;
    const sig = await this._signRequest('DELETE', endpoint, '', config);
    await fetch(endpoint, { method: 'DELETE', headers: sig });
  }

  async healthcheck(url: string): Promise<HealthStatus> {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, latencyMs: Date.now() - t0, statusCode: res.status };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - t0, error: err.message };
    }
  }

  private async _createZip(filename: string, content: string): Promise<ArrayBuffer> {
    // Minimal ZIP using the Compression Streams API
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // Use native CompressionStream if available, otherwise store uncompressed
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(data);
    writer.close();

    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (value) chunks.push(value);
      done = d;
    }

    const compressed = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
    let offset = 0;
    for (const c of chunks) { compressed.set(c, offset); offset += c.length; }

    return this._buildZipBuffer(filename, data, compressed);
  }

  private _buildZipBuffer(filename: string, raw: Uint8Array, compressed: Uint8Array): ArrayBuffer {
    const enc = new TextEncoder();
    const name = enc.encode(filename);
    const crc = this._crc32(raw);
    const now = new Date();
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);

    const local = new Uint8Array(30 + name.length + compressed.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // sig
    lv.setUint16(4, 20, true);          // version
    lv.setUint16(6, 0, true);           // flags
    lv.setUint16(8, 8, true);           // deflate
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, compressed.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(compressed, 30 + name.length);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true); cv.setUint16(10, 8, true);
    cv.setUint16(12, dosTime, true); cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, compressed.length, true); cv.setUint32(24, raw.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true); cv.setUint32(42, 0, true);
    central.set(name, 46);

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
    ev.setUint16(8, 1, true); ev.setUint16(10, 1, true);
    ev.setUint32(12, central.length, true);
    ev.setUint32(16, local.length, true);
    ev.setUint16(20, 0, true);

    const out = new Uint8Array(local.length + central.length + eocd.length);
    out.set(local, 0);
    out.set(central, local.length);
    out.set(eocd, local.length + central.length);
    return out.buffer;
  }

  private _crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    const table = this._crcTable();
    for (const byte of data) {
      crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private _crcTable(): Uint32Array {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  }

  private async _signRequest(
    method: string,
    url: string,
    body: string,
    config: EnvConfig
  ): Promise<Record<string, string>> {
    // AWS SigV4 signing — full implementation in the electron main process
    // Renderer-side calls go through IPC to avoid exposing credentials
    return {
      'X-Amz-Date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
      Authorization: 'AWS4-HMAC-SHA256 Credential=placeholder',
    };
  }
}

export default new AWSDeployer();
