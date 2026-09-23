import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "node:readline/promises";

const client = new Anthropic();
const model = "claude-sonnet-4-5-20250929";

async function runChat(systemPrompt?: string) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let messages: Anthropic.MessageParam[] = [];
    let stdinClosed = false;
    rl.on("close", () => { stdinClosed = true; });

    while (true) {
        if (stdinClosed) break;
        const userInput = await rl.question("> ").catch(() => null);
        if (userInput === null || userInput.trim().toLowerCase() === "exit") break;

        messages.push({ role: "user", content: userInput });

        const params: Anthropic.MessageCreateParamsNonStreaming = {
            model: model,
            max_tokens: 1000,
            messages: messages,
        }

        if (systemPrompt) {
            params.system = systemPrompt;
        }

        const response = await client.messages.create(params);

        messages.push({ role: "assistant", content: response.content });

        const textBlock = response.content.find((b) => b.type === "text");
        if (textBlock && textBlock.type === "text") {
            console.log(textBlock.text);
        }
    }

    rl.close();
}

runChat("You are Python Engineer that writes concise code.");
