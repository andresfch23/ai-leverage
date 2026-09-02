# 2026-08-25 — Block 01: Agentic Loop and Tool Calling

## What was done

- Built `agent-loop.ts` from scratch: a working agentic loop (no
  framework) against a simulated refund system with three tools
  (`get_order`, `process_refund`, `escalate_to_human`).
- Ran it against a real request: "refund for order-123, item arrived
  damaged." Predicted the tool call sequence before running, then
  compared prediction against actual behavior.
- Documented a real finding in `README.md`: the model refunded $45
  automatically based only on the customer's claim, with no amount
  check and no escalation — the system prompt's "check the order
  first" instruction was followed, but that's different from
  "verify the refund is reasonable," which was never instructed at
  all. Same prompt would refund $890 (order-456) with the same lack
  of friction.
- Reviewed `function` vs arrow function declarations (hoisting,
  `this` binding, declaration vs expression) and `Promise.all` for
  parallel tool execution (parallelism for speed, not race-condition
  prevention).

## Decisions made and why

- Used the refund-system finding as the concrete motivation for
  Block 04 (hooks/enforcement) instead of treating it as an abstract
  best practice — the README frames Block 04 as "the fix for the
  exact gap this block exposed."
- Caught and corrected a sequencing mistake: Block 03 (evals) had
  been built before Blocks 01 and 02 had real code, only concepts.
  Went back and built Block 01 for real before continuing forward,
  rather than skip ahead again.

## Today's deliverable

`01-agentic-loop/` complete: `agent-loop.ts`, `README.md`. Committed
and pushed on branch `block-01-agentic-loop`.

## Anthropic Academy courses

- "Building with the Claude API" — in progress, not finished this
  session (9h course, being split across several sessions).

## Next step

- Block 02: structured output, applied to this same refund-tools
  domain for consistency with Block 01.