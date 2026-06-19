import { NextRequest } from 'next/server';
import { createWebRegistry } from '@ai-hub/provider-core';
import type { Message } from '@ai-hub/provider-core';

// API keys NEVER leave the server — read from env only, never forwarded to client.
function getKeys() {
  return {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };
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

  const registry = createWebRegistry(getKeys());
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
