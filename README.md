# CF AI Research Agent

> An AI-powered research assistant that decomposes complex topics, researches each angle independently, and synthesizes comprehensive reports — running entirely on Cloudflare's global edge network.

## Live Demo

**https://cf-ai-research-agent.baris-peksak.workers.dev**

## Architecture

The agent follows a multi-step research pipeline:

```
                         ┌─────────────────────┐
                         │   User submits topic │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                    ┌────┤  1. DECOMPOSE        │
                    │    │  Break into 3-4      │
                    │    │  sub-questions        │
                    │    └──────────┬──────────┘
                    │               │
               Workers AI          │
            (Llama 3.3 70B)        │
                    │    ┌──────────▼──────────┐
                    │    │  2. RESEARCH         │
                    ├────┤  Research each       │
                    │    │  sub-question        │
                    │    │  (sequential, with   │
                    │    │   shared context)     │
                    │    └──────────┬──────────┘
                    │               │
                    │    ┌──────────▼──────────┐
                    │    │  3. SYNTHESIZE       │
                    └────┤  Combine findings    │
                         │  into structured     │
                         │  research brief      │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  4. FOLLOW-UP       │
                         │  Q&A with full      │
                         │  research context   │
                         └─────────────────────┘

  State persisted in ─── Durable Object ─── ctx.storage
```

### Request Flow

```
Browser → Worker (index.ts) → Agent Logic (agent.ts) → Workers AI
                ↕                                        (Llama 3.3 70B)
        Durable Object (session.ts)
            ctx.storage
    (messages + research state)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Cloudflare Workers |
| AI Model | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` via Workers AI |
| State Management | Durable Objects with `ctx.storage` |
| Language | TypeScript |
| Frontend | Vanilla HTML/CSS/JS (single file, dark theme) |
| Build Tool | Wrangler |

## Run Locally

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd cf_ai_research_agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Cloudflare** (needed for Workers AI access even locally)
   ```bash
   npx wrangler login
   ```

4. **Start development server**
   ```bash
   npx wrangler dev
   ```

5. **Open in browser**
   ```
   http://localhost:8787
   ```

## Deploy

```bash
npx wrangler deploy
```

The output will show your deployed URL: `https://cf-ai-research-agent.<your-subdomain>.workers.dev`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serves the frontend |
| `POST` | `/api/research` | Start research `{ topic, sessionId? }` |
| `POST` | `/api/followup` | Ask follow-up `{ question, sessionId }` |
| `GET` | `/api/session/:id` | Get session state + messages |
| `DELETE` | `/api/session/:id` | Reset a session |

## Design Decisions

### Why Durable Objects for State?

Durable Objects provide per-session isolated storage that persists across requests without needing an external database. Each research session gets its own DO instance with:
- **Guaranteed consistency** — single-threaded access per session, no race conditions
- **Zero config** — no database setup, connection strings, or migrations
- **Edge locality** — state lives close to the user
- **Automatic lifecycle** — hibernates when idle, wakes on request

### Why a Multi-Step Agent Approach?

Instead of dumping the entire topic into a single LLM call:
- **Decomposition** forces structured thinking about what aspects matter
- **Sequential research** with shared context allows each finding to build on previous ones, improving coherence
- **Synthesis** as a separate step produces better-organized output than a single monolithic response
- **Follow-up** with full context enables conversational depth without re-researching

### Why Llama 3.3 70B?

- Available via Workers AI with no API key management
- Strong instruction-following capabilities for structured output (JSON arrays, markdown reports)
- Good balance of quality and speed for an interactive research tool
- Runs on Cloudflare's GPU infrastructure — no cold starts or provisioning
