import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const REPO_OWNER = "nestjs";
const REPO_NAME = "typescript-starter";

// --- Real GitHub API calls, no fake data this time ---------------------

async function listDirectory(path: string): Promise<any> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { error: `Could not list ${path}: ${res.status} ${res.statusText}` };
  }
  const data = await res.json();
  return data.map((entry: any) => ({ name: entry.name, type: entry.type }));
}

async function readFile(path: string): Promise<any> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { error: `Could not read ${path}: ${res.status} ${res.statusText}` };
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return { error: `${path} is a directory, not a file. Use list_directory instead.` };
  }
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { path, content };
}

// --- Verification tool: searches ALL files already read, returns every
// match — not just whether it was found once. -----------------------------

const readFilesCache: Record<string, string> = {};

function verifyClaim(keyword: string): any {
  const matches = Object.entries(readFilesCache)
    .filter(([, content]) => content.toLowerCase().includes(keyword.toLowerCase()))
    .map(([path]) => path);
  return { keyword, foundIn: matches, verified: matches.length > 0 };
}

// --- Tool definitions -----------------------------------------------------

const tools: Anthropic.Tool[] = [
  {
    name: "list_directory",
    description:
      "List files and folders inside a directory of the repo. Use an " +
      "empty string for the repo root.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a specific file by its path.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "verify_claim",
    description:
      "Before including a finding in your final summary, verify it by " +
      "searching a keyword across the files you've already read. This " +
      "returns EVERY file where the keyword was found, not just one — " +
      "when you write the finding, list all of them in evidenceFiles, " +
      "not just the first.",
    input_schema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "A short keyword to search for, e.g. 'express', 'jest', '@Injectable'",
        },
      },
      required: ["keyword"],
    },
  },
];

const summaryTool: Anthropic.Tool = {
  name: "submit_summary",
  description: "Submit the final architecture summary once you're confident in it.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "A short overall description of the project." },
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            claim: { type: "string" },
            evidenceFiles: {
              type: "array",
              items: { type: "string" },
              description:
                "ALL files that support this claim, from verify_claim's foundIn — " +
                "not just one, even if there are several.",
            },
            verified: { type: "boolean" },
          },
          required: ["claim", "evidenceFiles", "verified"],
        },
      },
    },
    required: ["summary", "findings"],
  },
};

// --- Executing whichever tool the model asks for --------------------------

async function executeTool(name: string, input: any): Promise<any> {
  switch (name) {
    case "list_directory":
      return listDirectory(input.path);
    case "read_file": {
      const result = await readFile(input.path);
      if (result.content) readFilesCache[input.path] = result.content;
      return result;
    }
    case "verify_claim":
      return verifyClaim(input.keyword);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// --- The loop ----------------------------------------------------------

async function exploreRepo(question: string) {
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];
  console.log(`\nQuestion: ${question}\n`);

  const MAX_ITERATIONS = 15;
  let iterations = 0;

  while (true) {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      console.log("Stopped: too many iterations.");
      break;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      temperature: 0,
      system:
        "You are exploring a real GitHub repository to answer a " +
        "question about its architecture. Decide yourself which files " +
        "are worth reading — don't try to read everything. Before " +
        "including any specific technical claim (a library used, a " +
        "pattern followed) in your final summary, call verify_claim to " +
        "confirm it against files you've actually read. verify_claim " +
        "returns every matching file — when you write the finding, " +
        "include ALL of them in evidenceFiles, not just one, so the " +
        "summary reflects how well-supported the claim really is. If a " +
        "claim can't be verified, either don't include it or mark it " +
        "as unverified. When ready, call submit_summary exactly once.",
      tools: [...tools, summaryTool],
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      console.log(`Claude: ${textBlock.text}`);
    }

    if (response.stop_reason !== "tool_use") {
      console.log("\n--- done (end_turn, no summary submitted) ---");
      break;
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const summaryCall = toolUses.find((t) => t.name === "submit_summary");
    if (summaryCall) {
      console.log("\n=== FINAL SUMMARY ===");
      console.log(JSON.stringify(summaryCall.input, null, 2));
      break;
    }

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        console.log(`  -> ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
        const result = await executeTool(toolUse.name, toolUse.input);
        console.log(`  <- ${JSON.stringify(result).slice(0, 200)}`);
        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        };
      })
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }
}

exploreRepo(
  "What HTTP framework does this project use under the hood, and how is testing set up?"
).catch(console.error);