import Anthropic from "@anthropic-ai/sdk";

// The exact shape we want Claude to return — structured outputs guarantee
// valid JSON, so the frontend never has to deal with parse errors.
const SCHEMA = {
  type: "object",
  properties: {
    destinations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "City or region name" },
          country: { type: "string" },
          description: {
            type: "string",
            description: "One vivid sentence selling the place.",
          },
          whyItFits: {
            type: "string",
            description: "Why it matches this traveler's answers, 1–2 sentences.",
          },
          approxBudget: {
            type: "string",
            description: "Rough total per person, e.g. '€900–1,200'.",
          },
          weather: {
            type: "string",
            description: "What the weather is like during their travel dates.",
          },
          activities: {
            type: "array",
            description: "Exactly 3 short activity ideas.",
            items: { type: "string" },
          },
        },
        required: [
          "name",
          "country",
          "description",
          "whyItFits",
          "approxBudget",
          "weather",
          "activities",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["destinations"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are wandr — a sharp, well-travelled friend who plans trips fast.
Voice: relaxed, energetic, "you/your", evocative (dream, escape, discover). No corporate tone.
Given a traveler's quiz answers, recommend exactly 3 destinations that genuinely fit them.
Pick varied options (not three versions of the same place). Be realistic about budget and weather
for their travel dates and departure city. Keep every field short and punchy.
Infer the ideal weather from their travel dates (which give the season) and their chosen vibes —
the quiz no longer asks about climate directly.
If the traveler left free-text notes (the "extras" field), treat them as strong preferences:
honor explicit wants (a dream country, a specific feature, a diet) and avoid anything they ask to skip.`;

export async function POST(request) {
  // Guard: no key configured yet → a clear, friendly error instead of a crash.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it to .env.local and restart the server." },
      { status: 500 },
    );
  }

  try {
    const answers = await request.json();
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are my answers. Give me 3 destinations.\n\n${JSON.stringify(
            answers,
            null,
            2,
          )}`,
        },
      ],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    // With structured outputs the first text block is guaranteed-valid JSON.
    const textBlock = response.content.find((b) => b.type === "text");
    const data = JSON.parse(textBlock.text);

    return Response.json(data);
  } catch (err) {
    console.error("Destinations API error:", err);
    return Response.json(
      { error: err?.message || "Something went wrong generating destinations." },
      { status: 500 },
    );
  }
}
