import { Inject, Injectable } from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import net from 'node:net';
import { createHash, randomUUID } from 'node:crypto';
import { MAX_MANUSCRIPT_BYTES, type Manuscript } from '@sep/contracts';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { ApiException } from '../common/http.js';
@Injectable()
export class ManuscriptsService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}
  usable(file: Manuscript) { return file.scan === 'clean' || this.config.authMode === 'development-token' && ['development','test'].includes(process.env.NODE_ENV ?? ''); }
  async validate(bytes: Buffer, name: string): Promise<Manuscript> {
    if (!bytes.length || bytes.length > MAX_MANUSCRIPT_BYTES || !bytes.subarray(0,8).toString('ascii').startsWith('%PDF-')) throw new ApiException(400,'PDF_INVALID');
    let scan: Manuscript['scan'] = 'demo_unscanned';
    if (process.env.CLAMAV_HOST) { await this.scan(bytes); scan = 'clean'; }
    else if (this.config.authMode !== 'development-token' || !['development','test'].includes(process.env.NODE_ENV ?? '')) throw new ApiException(503,'FILE_SCAN_REQUIRED');
    const pages = await new Promise<number>((resolve,reject) => {
      const worker = new Worker(new URL('./pdf.worker.js',import.meta.url), { workerData: bytes, resourceLimits: { maxOldGenerationSizeMb: 128 } });
      const fail = () => reject(new ApiException(400,'PDF_INVALID'));
      const timer = setTimeout(() => { void worker.terminate(); fail(); },5000);
      worker.once('message',(value) => { clearTimeout(timer); void worker.terminate(); if(value.pages) resolve(value.pages); else fail(); });
      worker.once('error',() => { clearTimeout(timer); fail(); });
      worker.once('exit',(code) => { clearTimeout(timer); void code; fail(); });
    });
    return { id: randomUUID(), name: name.replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(0,150) || 'manuscript.pdf', bytes: bytes.length, pages,
      sha256: createHash('sha256').update(bytes).digest('hex'), scan };
  }
  private scan(bytes: Buffer): Promise<void> {
    return new Promise((resolve,reject) => {
      const port = Number(process.env.CLAMAV_PORT ?? 3310); if (!Number.isInteger(port) || port < 1 || port > 65535) { reject(new ApiException(503,'FILE_SCAN_REQUIRED')); return; }
      const socket = net.createConnection({ host: process.env.CLAMAV_HOST!, port }); let answer = ''; let finished = false;
      const finish = (ok: boolean, infected = false) => { if (finished) return; finished = true; socket.destroy(); if(ok) resolve(); else reject(new ApiException(infected ? 400 : 503,infected ? 'PDF_INFECTED' : 'FILE_SCAN_REQUIRED')); };
      socket.setTimeout(15000,() => finish(false)); socket.on('error',() => finish(false)); socket.on('end',() => finish(false));
      socket.on('data',(chunk) => { answer += chunk.toString('utf8'); if (answer.length > 4096) finish(false); else if (answer.includes('\0') || answer.includes('\n')) finish(/^stream: OK[\0\n]/.test(answer),answer.includes(' FOUND')); });
      socket.once('connect',() => { socket.write('zINSTREAM\0'); for (let offset=0;offset<bytes.length;offset+=65536) { const chunk=bytes.subarray(offset,offset+65536); const size=Buffer.alloc(4);size.writeUInt32BE(chunk.length);socket.write(size);socket.write(chunk); } socket.write(Buffer.alloc(4)); });
    });
  }
}
