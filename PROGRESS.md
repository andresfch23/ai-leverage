# PROGRESS — AI Leverage

**Last updated:** 2026-08-12

---

## Current topic

**0. Roadmap + PROGRESS.md** — Status: Awaiting deliverable

---

## Exactly where I left off

Session 1 closed. Roadmap agreed: 11 topics, with 5 documented adjustments to the base plan.
The 3 open decisions are resolved. What's left is the only thing that closes this topic:
create the `ai-leverage` repo and publish this file.

---

## Pending deliverable

- **What:** Public `ai-leverage` repo with `PROGRESS.md` at the root + a ~5-line `README.md`
  explaining the program and linking to the roadmap.
- **Where it lives:** [paste repo URL]
- **Review status:** Not submitted

**Definition of done:** public repo · README readable with no prior context ·
`PROGRESS.md` committed · folder structure created (see "Repo conventions").

---

## Roadmap

| # | Topic | Why it sits here | Language | Goal |
|---|---|---|---|---|
| 0 | Roadmap + PROGRESS.md | No map, no sequence | — | All |
| 1 | Claude Skills for frontend | My lead already validated the format on the backend side; fastest visibility win. The `SKILL.md` format is now portable across agents, not just Claude | Markdown | 1 (urgent) |
| 2 | LLM operational fundamentals: tokens, context, cost, latency | Everything else rests on this; without it I can't estimate or price work | TS | 1, 3 |
| 3 | Structured prompting and structured outputs (JSON/schemas) | This is what turns a chat into a software component | TS | 1, 3 |
| 4 | The Anthropic API as a builder: errors, retries, streaming, cost | Closes the backend gap on ground already covered in CardLens | TS | 2, 3 |
| 5 | Tool use / function calling | Mandatory conceptual base before MCP and agents | TS | 3 |
| 6 | Retrieval and grounding (applied RAG) | The single most requested skill in AI engineering postings today. Implemented as a tool, hence after topic 5. **Entry point to Python** | Python | 2, 3 |
| 7 | MCP: consuming a server | Understand the protocol from the easy side first | TS | 1, 3 |
| 8 | MCP: building my own server (spec 2026-07-28) | Highest technical-signal portfolio piece available right now | TS | 1, 2, 3 |
| 9 | Agents: orchestration and context control | Where real product value lives | TS or Python (decided on arrival) | 3 |
| 10 | Evals and reliability | What separates a demo from something billable | Python likely | 2, 3 |
| 11 | Demo to product: auth, limits, pricing, deployment | Turns skill into income | TS | 2, 3 |

Roadmap reviewed every 3 completed topics. Next review: on closing topic 3.

---

## Repo conventions

Monorepo `ai-leverage`, one folder per topic:

```
ai-leverage/
├── README.md
├── PROGRESS.md
├── 01-claude-skills/
│   └── README.md        ← what was built, why, what broke
├── 02-llm-fundamentals/
└── ...
```

Fixed rule: **every folder carries its own README** with the problem, the technical decision,
and what didn't work. Documented reasoning is what differentiates a portfolio; code alone
doesn't.

---

## Completed topics

- [ ] 0. Roadmap + PROGRESS.md — deliverable:
- [ ] 1. Claude Skills for frontend — deliverable:
- [ ] 2. LLM operational fundamentals — deliverable:
- [ ] 3. Structured prompting and outputs — deliverable:
- [ ] 4. The Anthropic API as a builder — deliverable:
- [ ] 5. Tool use / function calling — deliverable:
- [ ] 6. Retrieval and grounding (RAG) — deliverable:
- [ ] 7. MCP: consuming a server — deliverable:
- [ ] 8. MCP: building my own server — deliverable:
- [ ] 9. Agents: orchestration and context — deliverable:
- [ ] 10. Evals and reliability — deliverable:
- [ ] 11. Demo to product — deliverable:

---

## Deferred items

| Date | What was deferred | Why |
|---|---|---|
| | | |

---

## Roadmap change log

### 2026-08-12 — Session 1

**Change 1: added topic 6 (Retrieval and grounding / RAG).** — Confirmed.
Reason: research into 2026 AI engineering job postings consistently flags it as the most
requested skill in LLM application work. It was a direct gap against goal 2. It sits after tool
use because in practice retrieval is exposed to the model as a tool.

**Change 2: topic 8 explicitly targets MCP spec 2026-07-28.**
Reason: that revision, published July 28, 2026, is the largest since the protocol launched —
stateless core (the `Mcp-Session-Id` header is gone), extensions framework, hardened
authorization, and a formal deprecation policy. The legacy HTTP+SSE transport and the
roots/sampling/logging primitives are deprecated on a ~12-month window. Practical consequence:
nearly every MCP tutorial published before August 2026 teaches a transport that is no longer
the target.

**Change 3: authentication no longer lives only in topic 11.**
Reason: the new spec aligns authorization more closely with OAuth/OIDC. A remote MCP server
without auth is no longer a complete deliverable. Covered at a minimum working level in topic 8,
deepened in topic 11.

**Change 4: topic 9 anchors on the Claude Agent SDK as reference.**
Reason: it's the reference agentic runtime today (loop, subagents, context management,
permissions) rather than hand-rolling the loop. Verify pricing and billing model on arrival —
these changed in June 2026 and third-party blogs are not a reliable source for it.

**Change 5: Python enters at topic 6, not before.** — Decision delegated to the coach.
Reason: topics 1–5 serve goal 1, the most urgent one, and that goal plays out inside my current
company, where the language is JS/TS. Introducing Python at topic 4 would mean fighting two
battles at once: backend as a discipline *and* a new language. At topic 6 the real ecosystem is
Python, so the language stops being a tax and becomes the short path. Scoped tightly in topic 6:
read and run other people's Python fluently, and write my own ingestion and embeddings script.
There will be no standalone "Python topic" — that would be theory with no deliverable.

---

## Session log

| # | Date | Topic | What was done | Deliverable |
|---|---|---|---|---|
| 1 | 2026-08-12 | 0 | Ecosystem research, roadmap closed at 11 topics, 5 adjustments documented, 3 decisions resolved | PROGRESS.md v2 |
