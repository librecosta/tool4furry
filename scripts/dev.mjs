import { fork } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devOrigins } from '../src/config/dev-origins.mjs';

if (process.argv[2] === '--child') {
  const region = process.argv[3];
  process.env.SITE_REGION = region;
  process.env.NODE_ENV = 'development';
  const running = import('astro').then(({ dev }) => dev({
    server: { host: '127.0.0.1', port: Number(new URL(devOrigins[region]).port) },
  }));
  let closing = false;
  const stop = async () => {
    if (closing) return;
    closing = true;
    try { await (await running).stop(); } finally { process.exit(0); }
  };
  process.on('message', message => { if (message === 'stop') void stop(); });
  process.once('disconnect', stop);
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  await running;
} else {
  // A local IPC endpoint avoids stale PID files and never exposes a network API.
  const id = createHash('sha256').update(process.cwd()).digest('hex').slice(0, 12);
  const endpoint = process.platform === 'win32'
    ? `\\\\.\\pipe\\t4f-dev-${id}`
    : join(tmpdir(), `t4f-dev-${id}.sock`);
  if (process.argv[2] === 'stop') {
    const socket = connect(endpoint);
    socket.setTimeout(10000, () => socket.destroy(new Error('Dev shutdown timed out')));
    socket.once('connect', () => socket.write('stop'));
    socket.on('data', data => process.stdout.write(data));
    await once(socket, 'close');
  } else {
    if (process.argv[2]) throw new Error('Use pnpm dev or pnpm dev stop');
    const control = createServer(socket => {
      socket.once('data', async data => {
        if (data.toString() === 'stop') {
          await stop();
          socket.end('Stopped CN and Global development servers.\n');
        } else socket.end();
      });
    });
    control.listen(endpoint);
    await once(control, 'listening');
    const children = ['cn', 'global'].map(region => fork(import.meta.filename, ['--child', region]));
    let stopping = false;
    async function stop(code = 0) {
      if (stopping) return;
      stopping = true;
      control.close();
      process.exitCode = code;
      await Promise.all(children.map(async child => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        const exited = once(child, 'exit');
        if (child.connected) child.send('stop');
        const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
        timeout.unref();
        await exited;
        clearTimeout(timeout);
      }));
    }
    for (const child of children) child.once('exit', code => { if (!stopping) void stop(code || 1); });
    process.once('SIGINT', () => void stop());
    process.once('SIGTERM', () => void stop());
    console.log(`CN: ${devOrigins.cn}\nGlobal: ${devOrigins.global}\nCtrl+C or pnpm dev stop stops both.`);
  }
}
