import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// --- Simulated backend, extended from 01-agentic-loop ----------------

const FAKE_ORDERS: Record<
  string,
  { id: string; amount: number; status: string; ownerId: string; used: boolean }
> = {
  "order-123": { id: "order-123", amount: 45, status: "delivered", ownerId: "user-1", used: false },
  "order-456": { id: "order-456", amount: 890, status: "delivered", ownerId: "user-2", used: true },
};

// The "logged in" user for this run — used by the permission check.
const CURRENT_USER_ID = "user-1";

interface ToolError {
  errorCategory: "transient" | "validation" | "business" | "permission";
  isRetryable: boolean;
  message: string;
}

function isToolError(x: any): x is ToolError {
  return x && typeof x === "object" && "errorCategory" in x;
}

// --- Tool implementations, now returning typed errors -----------------

function getOrder(orderId: string): any {
  const order = FAKE_ORDERS[orderId];
  if (!order) {
    const err: ToolError = {
      errorCategory: "validation",
      isRetryable: false,
      message: `No order found with id ${orderId}. Check the ID and try again.`,
    };
    return err;
  }
  return { found: true, order };
}

function processRefund(orderId: string, amount: number, reason: string): any {
  const order = FAKE_ORDERS[orderId];

  // permission: does this order belong to the current user?
  if (order && order.ownerId !== CURRENT_USER_ID) {
    const err: ToolError = {
      errorCategory: "permission",
      isRetryable: false,
      message: `Order ${orderId} does not belong to the current user.`,
    };
    return err;
  }

  // validation: is the reason a real explanation, not empty/nonsense?
  if (!reason || reason.trim().length < 5) {
    const err: ToolError = {
      errorCategory: "validation",
      isRetryable: false,
      message: `Refund reason is missing or not descriptive enough.`,
    };
    return err;
  }

  // business: item already used, and reason implies "changed mind"
  if (order?.used && /don't (want|like)|changed my mind|used it/i.test(reason)) {
    const err: ToolError = {
      errorCategory: "business",
      isRetryable: false,
      message: `Item was already used. Change-of-mind refunds only apply to unused items.`,
    };
    return err;
  }

  return {
    success: true,
    orderId,
    refundedAmount: amount,
    message: `Refunded $${amount} for order ${orderId}`,
  };
}

function escalateToHuman(reason: string) {
  return { escalated: true, message: `Escalated to a human agent. Reason: ${reason}` };
}

// --- The deterministic hook -------------------------------------------
// Runs BEFORE the tool executes. This is a code-level gate, not a
// prompt instruction — it cannot be talked around by the model.

const REFUND_APPROVAL_THRESHOLD = 100;

function refundHook(toolName: string, input: any): { blocked: boolean; reason?: string } {
  if (toolName === "process_refund" && input.amount > REFUND_APPROVAL_THRESHOLD) {
    return {
      blocked: true,
      reason: `Refunds over $${REFUND_APPROVAL_THRESHOLD} require human approval. This one is for $${input.amount}.`,
    };
  }
  return { blocked: false };
}

// --- Tool definitions ---------------------------------------------------

const tools: Anthropic.Tool[] = [
  {
    name: "get_order",
    description: "Look up an order by its ID.",
    input_schema: {
      type: "object",
      properties: { orderId: { type: "string" } },
      required: ["orderId"],
    },
  },
  {
    name: "process_refund",
    description: "Process a refund for a given order, amount, and reason.",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        amount: { type: "number" },
        reason: { type: "string", description: "Why the customer wants a refund." },
      },
      required: ["orderId", "amount", "reason"],
    },
  },
  {
    name: "escalate_to_human",
    description: "Escalate when the request cannot be resolved automatically.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
];

// --- Executing a tool call, with the hook gating it first --------------

function executeTool(name: string, input: any): any {
  const hookResult = refundHook(name, input);
  if (hookResult.blocked) {
    const err: ToolError = {
      errorCategory: "business",
      isRetryable: false,
      message: hookResult.reason!,
    };
    return err;
  }

  switch (name) {
    case "get_order":
      return getOrder(input.orderId);
    case "process_refund":
      return processRefund(input.orderId, input.amount, input.reason);
    case "escalate_to_human":
      return escalateToHuman(input.reason);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// --- The agentic loop, same shape as 01-agentic-loop --------------------

async function runAgent(userMessage: string) {
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  console.log(`\nUser: ${userMessage}\n`);

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      temperature: 0,
      system:
        "You are a customer support agent. Always check the order " +
        "before refunding it, and always include a reason for the " +
        "refund based on what the customer told you. If a tool " +
        "returns an error, read its errorCategory: if isRetryable is " +
        "true, you may try again; if false, do not retry the same " +
        "action — explain the issue to the customer or escalate.",
      tools,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      console.log(`Claude: ${textBlock.text}`);
    }

    if (response.stop_reason !== "tool_use") {
      console.log("\n--- done (end_turn) ---");
      break;
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        console.log(`  -> calling ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
        const result = executeTool(toolUse.name, toolUse.input);

        if (isToolError(result)) {
          console.log(`  <- ERROR [${result.errorCategory}, retryable=${result.isRetryable}]: ${result.message}`);
        } else {
          console.log(`  <- result: ${JSON.stringify(result)}`);
        }

        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
          is_error: isToolError(result),
        };
      })
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }
}

runAgent(
  "A customer wants a refund of $890 for order-456. They say they just don't want it anymore."
).catch(console.error);