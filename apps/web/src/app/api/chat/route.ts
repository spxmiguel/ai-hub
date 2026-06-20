import { NextRequest } from 'next/server';
import { createWebRegistry } from '@ai-hub/provider-core';
import type { Message } from '@ai-hub/provider-core';

// Per-user keys arrive as request headers; env vars are fallback.
// Keys are used server-side only — NEVER forwarded or returned to browser.
function getKeys(req: NextRequest) {
  const keys: { claude?: string; openai?: string; gemini?: string } = {};
  const claude = req.headers.get('X-Anthropic-Key') || process.env.ANTHROPIC_API_KEY;
  const openai = req.headers.get('X-OpenAI-Key') || process.env.OPENAI_API_KEY;
  const gemini = req.headers.get('X-Gemini-Key') || process.env.GEMINI_API_KEY;
  if (claude) keys.claude = claude;
  if (openai) keys.openai = openai;
  if (gemini) keys.gemini = gemini;
  return keys;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider, model, messages } = body as {
    provider: string;
    model: string;
    messages: Message[];
  };

  if (!provider || !model || !Array.isArray(messages)) {
    return new Response('Bad request', { status: 400 });
  }

  const registry = createWebRegistry(getKeys(req));
  const p = registry.get(provider);
  if (!p) {
    return new Response(`Provider "${provider}" unavailable`, { status: 503 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of p.stream(messages, { model })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[ERROR] ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
