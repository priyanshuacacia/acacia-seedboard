// POST /api/import-transcript
// Reads a meeting transcript and returns proposed tasks assigned to the team.
// The API key lives only in the Vercel environment, never in the browser.
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60; // allow up to 60s for the model call (Vercel Hobby max)

const OWNER_KEYS = ["tyron", "catherine", "niamh", "priyanshu", "ben", "kate", "jolanta"];
const URGENCIES = ["urgent", "today", "week", "upcoming", "ongoing"];

const TASK_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ownerKey: { type: "string", enum: OWNER_KEYS },
          title: { type: "string" },
          urgency: { type: "string", enum: URGENCIES },
          due: { type: "string" }
        },
        required: ["ownerKey", "title", "urgency", "due"],
        additionalProperties: false
      }
    }
  },
  required: ["tasks"],
  additionalProperties: false
};

const SYSTEM = [
  "You extract action items from a meeting transcript for Acacia Wealth's team task board.",
  "Team members — use the exact ownerKey shown:",
  "  tyron (Tyron), catherine (Catherine), niamh (Niamh), priyanshu (Priyanshu), ben (Ben), kate (Kate), jolanta (Jolanta)",
  "Rules:",
  "- Return only concrete, actionable tasks that were agreed or clearly implied. Ignore chit-chat and general discussion.",
  "- Assign each task to the person responsible based on the transcript. If genuinely unclear, pick the most likely owner — a human reviewer will correct it before anything is saved.",
  "- urgency must be one of: urgent, today, week, upcoming, ongoing. Use \"week\" if no timing is given.",
  "- title: a short imperative task, e.g. \"Chase missing ISIN for 7IM Active 4\". Keep under ~90 characters.",
  "- due: a short human label if a deadline is mentioned (e.g. \"Fri\", \"end of month\"); otherwise an empty string.",
  "- If there are no genuine action items, return an empty tasks array."
].join("\n");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const transcript = ((req.body && req.body.transcript) || "").toString();
  if (!transcript.trim()) {
    return res.status(400).json({ error: "No transcript text was provided." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is not configured. Add it in the Vercel project settings."
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: "user", content: "Transcript:\n\n" + transcript }],
      output_config: { format: { type: "json_schema", schema: TASK_SCHEMA } }
    });
    const textBlock = (message.content || []).find((b) => b.type === "text");
    const parsed = JSON.parse(textBlock ? textBlock.text : '{"tasks":[]}');
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    return res.status(200).json({ tasks, model: message.model });
  } catch (e) {
    console.error("import-transcript failed", e);
    const detail = e && e.message ? e.message : "unknown error";
    return res.status(500).json({ error: "Failed to analyse transcript: " + detail });
  }
}
