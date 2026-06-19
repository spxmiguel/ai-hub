# AI Hub

> One interface for every AI. No tab switching.

**[Launch App →](https://ai-hub-web.vercel.app)** · **[Landing Page →](https://miguelramthunmoretti.github.io/ai-hub)**

---

## What is this

AI Hub unifies Claude, ChatGPT, Gemini, and local Ollama models into a single clean chat interface — styled after ChatGPT's UI. You pick the provider per conversation. Memory persists in your Google Drive and makes every AI smarter over time.

## Features

| | |
|---|---|
| 🧠 **Persistent Memory** | Learns you. Stores context in `ai-hub-memory.md` on your Google Drive. |
| ⚡ **Skills** | Toggle modes (Caveman, UI/UX Pro, Code) that shape every response. |
| 🔀 **Multi-provider** | Claude · ChatGPT · Gemini · Ollama — swap mid-session. |
| 🔒 **Key security** | API keys stay server-side. Browser gets text only, never keys. |
| 🖥️ **Desktop** | Electron app for Mac + Windows. Adds Ollama + CLI terminal. |
| 🌑 **Dark-only** | Purple accent. No light mode. |

## Stack

```
apps/
  web/       Next.js 15 App Router · Firebase Auth · Vercel
  desktop/   Electron 32 + React · electron-vite
packages/
  provider-core/    Unified AI provider interface
  skills-registry/  Skills + system prompt composer
  memory-manager/   Google Drive memory r/w
  keystore/         OS Keychain abstraction
```

## Deployments

| Service | Role |
|---------|------|
| **Vercel** | Next.js web app |
| **Firebase** | Google Auth (+ Drive scope for memory) |
| **GitHub Pages** | Landing page (`/docs`) |
| **Google Drive** | Per-user `ai-hub-memory.md` |

## Setup (web)

```bash
# 1. Clone
git clone https://github.com/miguelramthunmoretti/ai-hub
cd ai-hub

# 2. Install
pnpm install

# 3. Configure
cp apps/web/.env.example apps/web/.env.local
# fill in ANTHROPIC_API_KEY + NEXT_PUBLIC_FIREBASE_* vars

# 4. Run
pnpm dev
```

Env vars needed:

```env
ANTHROPIC_API_KEY=sk-ant-...

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## How memory works

1. Sign in with Google — grants `drive.file` scope
2. Each session, AI reads `ai-hub-memory.md` from your Drive
3. When AI replies with `[MEMORY]...[/MEMORY]` blocks, they auto-append
4. File stays trimmed to last 150 lines — lightweight, always fast

## Skills

| Skill | Effect |
|-------|--------|
| **Caveman** | Ultra-terse. Drop filler. Save tokens. On by default. |
| **UI/UX Pro** | Expert design + Tailwind + WCAG 2.1 AA. |
| **Code** | Implementation focus. Full files, no snippets. |

---

Made by [Miguel](https://github.com/miguelramthunmoretti)
