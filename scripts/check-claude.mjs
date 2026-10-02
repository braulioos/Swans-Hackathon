// Smoke test: confirms ANTHROPIC_API_KEY in .env.local works. Costs a fraction of a cent.
// Run: npm run check:claude
import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is empty. Paste your key into .env.local and save the file.");
  process.exit(1);
}

const client = new Anthropic();

try {
  const response = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 1024,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "Reply with exactly: Case Digest is connected." }],
  });
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  console.log(`OK: ${text}`);
  console.log(`Tokens used: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);
} catch (err) {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Key rejected (401). Re-copy it from the console; it may have a missing character.");
  } else if (err instanceof Anthropic.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (String(err.message).toLowerCase().includes("credit")) console.error("Add credits under Billing in the console.");
  } else {
    console.error(err);
  }
  process.exit(1);
}
