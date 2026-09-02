# PROGRESS — AI Leverage

**Last updated:** 2026-08-27

One-page snapshot of where this project stands. Full session-by-session
detail lives in `progress-log/`.

---

## Study plan overview

12 blocks, 4h/day study sessions. Full plan and reasoning in
`plan-de-estudio.md`.

| # | Block | Status |
|---|---|---|
| 01 | Agentic loop and tool calling | ✅ Closed |
| 02 | Structured output | ✅ Closed |
| 03 | Evals and non-determinism | ✅ Closed |
| 04 | Errors, retries, deterministic enforcement (hooks) | 🔵 In progress |
| 05 | Narrative: why-red-bot + PR reviewer case studies | Pending |
| 06 | Streaming and conversational UI | Pending |
| 07 | Agent Skills and rules | Pending |
| 08 | MCP: building a server | Pending |
| 09 | Coordinator + subagents | Pending |
| 10 | Backend: NestJS + PostgreSQL + SQL | Pending |
| 11 | Connecting the agent to a real backend | Pending |
| 12 | Context, cost, and observability | Pending |

---

## Repo structure

```
ai-leverage/
├── README.md
├── PROGRESS.md              ← this file
├── plan-de-estudio.md       ← full plan, reasoning, schedule
├── progress-log/            ← one file per study session
├── 01-agentic-loop/
├── 02-structured-output/
├── 03-evals/
└── 04-errors-and-hooks/     ← in progress
```

Fixed rule: every block folder carries its own `README.md` with what
was built, the real decisions made, and what didn't work the first
time. Documented reasoning is what differentiates a portfolio; code
alone doesn't.

---

## Closed blocks — one-line summary

**01 — Agentic loop:** built a working loop (no framework) against a
simulated refund system. Real finding: the model refunded $45 based
only on the customer's claim, with zero amount validation — direct
motivation for block 04.

**02 — Structured output:** refund-request classifier with a nullable
`refundEligible` field. Found that a vague "use null when uncertain"
instruction made the model default to null too often; fixed by giving
it an explicit refund policy to reason against instead.

**03 — Evals:** eval harness for a PR-reviewing agent. Went from 25%
to 100% pass rate across three rounds of prompt fixes, and traced a
non-deterministic failure to a bug in the test data itself, not the
prompt.

Full narrative for each in its own `README.md`.

---

## Anthropic Academy courses

| Course | Status |
|---|---|
| Claude 101 | ✅ Completed |
| Claude Code 101 | ✅ Completed |
| Building with the Claude API | 🔵 In progress |
| Introduction to Agent Skills | Pending — planned for block 07 |
| Introduction to Model Context Protocol | Pending — planned for block 08 |
| Introduction to subagents | Pending — planned for block 09 |
| Claude on Google Cloud | Pending — planned for block 10/11 |