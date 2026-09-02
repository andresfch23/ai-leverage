import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// --- Simulated backend --------------------------------------------
// In a real system these would call an actual database/API.
// Here they're fake data so the loop has something real to orchestrate.

const FAKE_ORDERS: Record<string, { id: string; amount: number; status: string }> = {
  "order-123": { id: "order-123", amount: 45, status: "delivered" },
  "order-456": { id: "order-456", amount: 890, status: "delivered" },
};

function getOrder(orderId: string) {
  const order = FAKE_ORDERS[orderId];
  if (!order) {
    return { found: false, message: `No order found with id ${orderId}` };
  }
  return { found: true, order };
}

function processRefund(orderId: string, amount: number) {
  return {
    success: true,
    orderId,
    refundedAmount: amount,
    message: `Refunded $${amount} for order ${orderId}`,
  };
}

function escalateToHuman(reason: string) {
  return {
    escalated: true,
    message: `Escalated to a human agent. Reason: ${reason}`,
  };
}

// --- Tool definitions the model can see -----------------------------

const tools: Anthropic.Tool[] = [
  {
    name: "get_order",
    description: "Look up an order by its ID to check its amount and status.",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "The order ID, e.g. 'order-123'" },
      },
      required: ["orderId"],
    },
  },
  {
    name: "process_refund",
    description: "Process a refund for a given order and amount.",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        amount: { type: "number" },
      },
      required: ["orderId", "amount"],
    },
  },
  {
    name: "escalate_to_human",
    description: "Escalate the request to a human agent when it cannot be resolved automatically.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why this needs human attention" },
      },
      required: ["reason"],
    },
  },
];

// --- Executing whatever tool the model asks for ----------------------

function executeTool(name: string, input: any): any {
  switch (name) {
    case "get_order":
      return getOrder(input.orderId);
    case "process_refund":
      return processRefund(input.orderId, input.amount);
    case "escalate_to_human":
      return escalateToHuman(input.reason);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// --- The agentic loop ------------------------------------------------

async function runAgent(userMessage: string) {
  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  console.log(`\nUser: ${userMessage}\n`);

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      temperature: 0,
      system:
        "You are a customer support agent. Use the tools available to " +
        "look up orders and process refunds. Always check the order " +
        "before refunding it.",
      tools,
      messages,
    });

    // Log any text the model produced this turn (its reasoning out loud)
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
        console.log(
          `  -> calling ${toolUse.name}(${JSON.stringify(toolUse.input)})`
        );
        const result = executeTool(toolUse.name, toolUse.input);
        console.log(`  <- result: ${JSON.stringify(result)}`);

        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        };
      })
    );

    // This is the step that's easy to forget: re-inject both the
    // model's own response AND the tool results before looping again.
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }
}

runAgent(
  "A customer wants a refund for order-123, they say the item arrived damaged."
).catch(console.error);