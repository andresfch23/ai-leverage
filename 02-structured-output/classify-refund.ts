import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// The "tool" here never executes anything real — it exists purely
// to force the model's response into this exact shape.
const classifyTool: Anthropic.Tool = {
  name: "classify_refund_request",
  description:
    "Classify a customer's refund request. Always call this tool exactly once.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["damaged", "wrong_item", "changed_mind", "billing_error", "other"],
        description: "The type of issue the customer is describing.",
      },
      urgency: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "How urgent this request is for the customer.",
      },
      refundEligible: {
        type: ["boolean", "null"],
        description:
          "Whether a refund applies, based on the refund policy. Use " +
          "null only if the policy genuinely cannot be applied with " +
          "the information given — not as a default for uncertainty.",
      },
      reasoning: {
        type: "string",
        description: "One or two sentences explaining the classification.",
      },
    },
    required: ["category", "urgency", "reasoning"],
    // refundEligible is intentionally NOT required — see 02-structured-output/README.md
  },
};

async function classifyRequest(customerMessage: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    temperature: 0,
    system:
      "You are a customer support triage assistant. Classify refund " +
      "requests accurately.\n\n" +
      "Refund policy:\n" +
      "- damaged: always eligible, full refund.\n" +
      "- wrong_item (seller sent the wrong product): always eligible, full refund.\n" +
      "- changed_mind (customer ordered the wrong size/color, or " +
      "simply doesn't want it anymore): eligible ONLY if the customer " +
      "states the item is unused/unopened. If they don't mention this, " +
      "treat it as unknown, not automatically eligible or ineligible.\n" +
      "- billing_error: always eligible, full refund.\n\n" +
      "Never fabricate refundEligible if the message doesn't give you " +
      "enough information to apply this policy — use null instead. " +
      "Only use null when the policy genuinely cannot be applied, not " +
      "as a default for uncertainty.",
    tools: [classifyTool],
    tool_choice: { type: "tool", name: "classify_refund_request" },
    messages: [{ role: "user", content: customerMessage }],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse) throw new Error("Model did not call the tool");

  return toolUse.input as {
    category: string;
    urgency: string;
    refundEligible: boolean | null;
    reasoning: string;
  };
}

async function main() {
  const testMessages = [
    "The item arrived completely damaged, box was crushed.",
    "I have an issue with my order, not sure what happened.",
    "I ordered the wrong size, can I get my money back?",
    "I ordered the wrong size, it's still unopened, can I get a refund?",
  ];

  for (const msg of testMessages) {
    console.log(`\nCustomer: "${msg}"`);
    const result = await classifyRequest(msg);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);