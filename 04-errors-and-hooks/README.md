# 04 — Errors, Retries, and Deterministic Enforcement

Extends the Block 01 refund-system loop with typed errors and a
hook that enforces a business rule in code, not in the prompt —
built directly from the unguarded-refund finding documented in
`01-agentic-loop/README.md`.

## Two separate mechanisms, not to be confused

**Typed errors** — when a tool call fails, it returns a structured
object instead of a plain string:

```typescript
interface ToolError {
  errorCategory: "transient" | "validation" | "business" | "permission";
  isRetryable: boolean;
  message: string;
}
```

This changes what the model can *do* about an error, not just what
it can *say*. The system prompt tells it: if `isRetryable` is false,
don't call the same tool again — explain or escalate instead.

**The hook** — code that runs *before* `process_refund` executes,
independent of anything the model decided:

```typescript
function refundHook(toolName: string, input: any) {
  if (toolName === "process_refund" && input.amount > 100) {
    return { blocked: true, reason: "..." };
  }
  return { blocked: false };
}
```

A prompt instruction ("don't refund over $100 without approval")
shapes what the model is *likely* to do. This hook guarantees it,
because the code runs regardless of the model's reasoning — it
can't be talked around.

## The four error categories, applied to this domain

- **`transient`** — a backend call fails temporarily (not implemented
  as real code here, since there's no real network call to fail —
  documented as the category that would apply to a database/API
  timeout on `get_order` or `process_refund`).
- **`validation`** — the refund reason is empty or too short to be
  a real explanation. The data itself is malformed, not against a
  rule.
- **`business`** — the item was already used and the customer's
  stated reason is "changed my mind" — the refund policy from
  `02-structured-output` doesn't allow that combination.
- **`permission`** — the order being refunded doesn't belong to the
  currently authenticated user. Not about the data being wrong; about
  whether this user should be able to act on this resource at all.

## What actually happened when it ran

Test message: refund $890 for `order-456`, reason "don't want it
anymore." This order also happens to belong to a different user
(`user-2`, not the current `user-1`) and is marked as already used —
meaning **three separate validations in the code could have rejected
this refund**: the amount hook, the ownership check, and the
used-item business rule.

Only one fired: **the hook**, because it runs first in `executeTool`,
before the code ever reaches `processRefund`'s internal checks. The
model correctly read the typed error (`isRetryable: false`), did not
retry the same call, and escalated to a human with a structured
handoff summary (order ID, amount, customer's reason, why it needs
approval) — without being explicitly told to include those details.

**This is expected behavior, not a bug**: when multiple layers of
validation could apply to the same request, whichever runs first is
the one that responds. The amount hook runs first by design — it's
the cheapest, most general check, ahead of the more specific ones
inside the tool itself.

One thing the ownership and used-item checks never got to prove in
this run: if the amount had been under $100 instead of $890, the
hook would have passed it through, and `processRefund`'s own checks
(ownership, used-item) would have caught it instead. Deliberately
left as separate layers rather than merging the used-item logic into
the hook — the hook stays scoped to one concern (amount), and each
validation lives closest to the data it needs.

## Running it

```bash
npm install
export ANTHROPIC_API_KEY="your-key"
npx tsx agent-with-hooks.ts
```

## Takeaway

A prompt rule and a code-level hook can say the exact same thing in
English, but only one of them is a guarantee. Typed errors don't
just make debugging easier — they change what the agent is capable
of deciding next.