# CF AI Research Agent — Project Guide

## Overview
A Cloudflare Workers-based AI research agent that decomposes topics into sub-questions, researches each one, synthesizes a report, and supports follow-up Q&A. Uses Workers AI (Llama 3.3 70B) and Durable Objects for persistent session state.

## Architecture
```
User → Worker (index.ts) → Agent Logic (agent.ts) → Workers AI (Llama 3.3 70B)
                         → Durable Object (session.ts) → Storage (conversation + state)
```

## Tech Stack
- **Runtime**: Cloudflare Workers
- **AI Model**: @cf/meta/llama-3.3-70b-instruct-fp8-fast via Workers AI binding
- **State**: Durable Objects with ctx.storage API
- **Language**: TypeScript (strict mode)
- **Build Tool**: Wrangler

## Project Structure
```
cf_ai_research_agent/
├── src/
│   ├── index.ts          # Main Worker entry point, routes, DO export
│   ├── agent.ts          # AI agent logic (decompose, research, synthesize, followup)
│   ├── session.ts        # Durable Object class for session state
│   └── frontend.html     # Single-file frontend (HTML + CSS + JS)
├── package.json
├── tsconfig.json
├── wrangler.toml
├── CLAUDE.md
├── TODO.md
├── PROMPTS.md
└── README.md
```

## Rules for Development
1. **Test after each step** — verify TypeScript compiles and wrangler can parse config
2. **Type safety** — all functions fully typed, no `any` unless absolutely necessary
3. **Error handling** — every AI call wrapped in try/catch with meaningful error messages
4. **Security** — CORS headers applied, input validation on all endpoints
5. **Keep it simple** — no over-engineering, minimal dependencies
6. **Professional frontend** — dark theme, clean typography, smooth animations, mobile responsive

## Key Bindings & Config
- `wrangler.toml`: Workers AI binding as `AI`, Durable Object binding as `RESEARCH_SESSION`
- Model ID: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Compatibility date: `2024-12-01`
- Compatibility flags: `nodejs_compat`

## Commands
- `npm install` — install dependencies
- `npx wrangler dev` — local development
- `npx wrangler deploy` — deploy to Cloudflare
- `npx wrangler types` — generate Worker types
