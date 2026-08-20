import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const dataset = JSON.parse(
  readFileSync(join(__dirname, "dataset.json"), "utf-8")
);
const systemPrompt = readFileSync(
  join(__dirname, "reviewer-prompt.txt"),
  "utf-8"
);

// Structured output tool — see 02-structured-output for the full pattern
const reviewTool = {
  name: "report_review",
  description:
    "Report the result of reviewing a code fragment. Always call this tool exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      should_flag: {
        type: "boolean",
        description: "true if a real bug was found, false otherwise",
      },
      severity: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        description: "Only present when should_flag is true",
      },
      category: {
        type: "string",
        enum: ["bug", "style", "other"],
        description: "Only present when should_flag is true",
      },
      reasoning: {
        type: "string",
        description: "One sentence explaining the decision",
      },
    },
    required: ["should_flag", "reasoning"],
  },
};

interface CaseResult {
  id: string;
  type: string;
  passed: boolean;
  expected: any;
  actual: any;
}

async function reviewCode(code: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: systemPrompt,
    tools: [reviewTool],
    tool_choice: { type: "tool", name: "report_review" },
    messages: [
      {
        role: "user",
        content: `Review this code fragment:\n\n${code}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not call the tool");
  }
  return toolUse.input as any;
}

function checkCase(expected: any, actual: any): boolean {
  if (expected.should_flag !== actual.should_flag) return false;
  // Only check severity when we expected a flag — matches how the
  // dataset is structured (severity is absent on negative cases)
  if (expected.should_flag && expected.severity !== actual.severity) {
    return false;
  }
  return true;
}

async function runEval() {
  const results: CaseResult[] = [];

  for (const testCase of dataset) {
    console.log(`Running ${testCase.id} (${testCase.type})...`);
    const actual = await reviewCode(testCase.input_code);
    const passed = checkCase(testCase.expected, actual);

    results.push({
      id: testCase.id,
      type: testCase.type,
      passed,
      expected: testCase.expected,
      actual,
    });
  }

  printReport(results);
}

function printReport(results: CaseResult[]) {
  console.log("\n=== RESULTS BY TYPE ===\n");

  const byType = results.reduce((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {} as Record<string, CaseResult[]>);

  for (const [type, cases] of Object.entries(byType)) {
    const passed = cases.filter((c) => c.passed).length;
    console.log(`${type}: ${passed}/${cases.length}`);
    for (const c of cases) {
      const mark = c.passed ? "PASS" : "FAIL";
      console.log(`  [${mark}] ${c.id}`);
      if (!c.passed) {
        console.log(`    expected: ${JSON.stringify(c.expected)}`);
        console.log(`    actual:   ${JSON.stringify(c.actual)}`);
      }
    }
  }

  const totalPassed = results.filter((r) => r.passed).length;
  console.log(
    `\nOverall: ${totalPassed}/${results.length} (${Math.round(
      (totalPassed / results.length) * 100
    )}%)`
  );
  console.log(
    "\nNote: the overall number hides per-type failures. Check the breakdown above."
  );
}

runEval().catch(console.error);