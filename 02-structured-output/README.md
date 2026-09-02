# 02 — Structured Output

A refund-request classifier that always returns a fixed JSON shape
via forced `tool_use`, instead of free-form text — built on the same
refund-system domain as `01-agentic-loop`.

## What this is for

In Block 01, `tool_use` was for triggering real actions (looking up
an order, processing a refund). Here it's used differently: the
"tool" never executes anything — it exists purely to force the
model's answer into a predictable shape your code can rely on
without parsing free text.

## The schema

```
category:        required, enum
urgency:          required, enum
reasoning:        required, string
refundEligible:   NOT required, boolean | null
```

`refundEligible` is the only field that can legitimately be missing
information for. The other three can always be filled — even with
incomplete data, the model can classify into "other" and estimate
urgency. Whether a refund applies is different: it depends on a
policy being satisfied, and sometimes the message just doesn't say
enough to apply that policy.

## What actually happened — and why the prompt changed

**First version:** the prompt only said "use null if you don't have
enough information." That produced a real problem — a message with
plenty of information ("wrong size, can I get my money back?") still
came back as `refundEligible: null`. The information given (wrong
size, customer error, wants a refund) was enough to reason about,
but the model had no refund policy to reason against, so it defaulted
to null as an easy way out. That's a different failure than the
genuinely ambiguous case ("I have an issue, not sure what happened"),
and the schema alone couldn't tell them apart.

**Fix:** added an explicit refund policy to the system prompt —
which categories are always eligible, and which ones ("changed_mind")
require a specific condition (item unused/unopened) that the
customer has to state. This is the same lesson as Block 03's severity
rubric: a vague instruction ("don't guess") doesn't work as well as
an explicit, checkable rule the model can apply.

**Result, before and after, same ambiguous message** ("wrong size,
can I get my money back?"):
- Before: `refundEligible: null`, reasoning didn't say why.
- After: `refundEligible: null`, reasoning explicitly names the
  missing fact: *"they haven't mentioned whether the item is
  unused/unopened."*

Same output value, but the second one is actionable — a real system
could use that reasoning to automatically ask the customer the exact
follow-up question needed, instead of just showing "unknown."

A fourth test message ("wrong size, still unopened") confirmed the
policy is actually being applied, not just recited: it returned
`refundEligible: true` with reasoning that cites the specific policy
rule that was satisfied.

## Running it

```bash
npm install
export ANTHROPIC_API_KEY="your-key"
npx tsx classify-refund.ts
```

## Takeaway

A nullable field being "correctly" null isn't enough on its own — the
*reasoning behind* the null matters just as much, because it's what
determines whether the ambiguity is something your system can act on
or a dead end.