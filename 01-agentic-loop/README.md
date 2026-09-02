# 01 — Agentic Loop and Tool Calling

A minimal agentic loop built from scratch (no framework, no Agent SDK)
against a simulated refund system, to understand exactly what happens
between a model deciding to call a tool and the tool actually running.

## What this is

Three simulated tools (`get_order`, `process_refund`,
`escalate_to_human`) backed by fake in-memory data — no real
database. The point isn't the refund logic itself, it's the loop
that connects the model's decisions to real code execution.

## The loop, in one sentence

Send messages + tool definitions → check `stop_reason` → if
`tool_use`, run the requested tool(s) and push both the model's own
response and the tool results back into the message history → repeat
until `stop_reason` is `end_turn`.

## Key things to notice in the code

- **Both messages get pushed back, not just the tool result.** The
  model's own response (`response.content`) has to go into history
  before the tool result, or the next turn has a `tool_result` with
  no matching `tool_use` — the API rejects that as an invalid
  message sequence.
- **Tool calls run in parallel with `Promise.all`, not sequentially.**
  This isn't about avoiding a race condition — the tool calls don't
  share state, so there's nothing to race. It's about speed: if the
  model requests multiple tools in one turn, running them in parallel
  finishes in the time of the slowest one instead of the sum of all
  of them.
- **`temperature: 0`** — same reasoning as in `03-evals`: this needs
  to behave consistently, not creatively.

## Running it

```bash
npm install
export ANTHROPIC_API_KEY="your-key"
npx tsx agent-loop.ts
```

## What actually happened when it ran

Input: *"A customer wants a refund for order-123, they say the item
arrived damaged."*

The model called `get_order` (following the system prompt's
instruction to always check the order first), saw it was a real,
delivered $45 order, and immediately called `process_refund` for the
full amount — no escalation, no second confirmation, nothing.

**That's the finding that matters here, not the happy path.** The
system prompt says to check the order before refunding — and the
model did. But "check the order" and "verify the refund amount is
reasonable" are two different things, and only the first one was
actually instructed. The fake dataset also has `order-456` at $890 —
with this exact same prompt, that amount would get refunded with the
same lack of friction.

This is not a bug in the loop. The loop did exactly what it was
supposed to: pass the model's decision through to execution. The
missing piece is that **a prompt instruction is not a guarantee** —
it shapes what the model is likely to do, not what it's forced to
do. There's currently no code-level check on the refund amount at
all.

## Why this matters for the next block

Block 04 builds a hook that intercepts `process_refund` before it
executes and blocks it above a threshold — deterministically, in
code, regardless of what the model decided. This block's finding is
the concrete reason that one exists: not as a theoretical best
practice, but because this exact loop, with this exact prompt, will
refund any amount a customer claims without any check.