import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readMemory, appendMemory } from '@ai-hub/memory-manager';

const PORT = 37420;

function cors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export function startCompanion() {
  const server = createServer(async (req, res) => {
    cors(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/memory' && req.method === 'GET') {
      const text = await readMemory();
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(text);
      return;
    }

    if (req.url === '/memory' && req.method === 'POST') {
      const body = await readBody(req);
      const { block } = JSON.parse(body);
      if (typeof block === 'string') await appendMemory(block);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[companion] listening on http://127.0.0.1:${PORT}`);
  });

  return server;
}
