import { NextRequest, NextResponse } from 'next/server';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FILE_NAME = 'ai-hub-memory.md';

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

async function findFile(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const res = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function readFile(token: string, fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return '';
  return res.text();
}

async function createFile(token: string, content: string): Promise<void> {
  const metadata = JSON.stringify({ name: FILE_NAME, mimeType: 'text/markdown' });
  const body = `--bound\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--bound\r\nContent-Type: text/markdown\r\n\r\n${content}\r\n--bound--`;
  await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/related; boundary=bound',
    },
    body,
  });
}

async function updateFile(token: string, fileId: string, content: string): Promise<void> {
  await fetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/markdown',
    },
    body: content,
  });
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return new Response('', { headers: { 'Content-Type': 'text/plain' } });

  try {
    const fileId = await findFile(token);
    if (!fileId) return new Response('', { headers: { 'Content-Type': 'text/plain' } });
    const text = await readFile(token, fileId);
    return new Response(text, { headers: { 'Content-Type': 'text/plain' } });
  } catch {
    return new Response('', { headers: { 'Content-Type': 'text/plain' } });
  }
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ ok: false, reason: 'no token' });

  const { block } = await req.json();
  if (typeof block !== 'string') return NextResponse.json({ error: 'missing block' }, { status: 400 });

  try {
    const fileId = await findFile(token);
    if (!fileId) {
      await createFile(token, block + '\n');
    } else {
      const existing = await readFile(token, fileId);
      const lines = existing.split('\n');
      const trimmed = lines.length > 150 ? lines.slice(-150).join('\n') : existing;
      await updateFile(token, fileId, trimmed + '\n' + block + '\n');
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: 'drive error' });
  }
}
