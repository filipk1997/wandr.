import Anthropic from "@anthropic-ai/sdk";

// Stage 2: the heavy, itemised breakdown for ONE destination, fetched lazily
// when the traveler taps "See details". Small + focused → fast and cheap.
export const maxDuration = 30;

const SCHEMA = {
  type: "object",
  properties: {
    whyItFits: {
      type: "string",
      description: "ONE sentence, max 18 words — why it fits THIS traveler (their vibes/who/notes).",
    },
    bestTime: {
      type: "string",
      description: "Max 10 words — best month + the weather then.",
    },
    costs: {
      type: "object",
      description:
        "Itemised for the whole party + their nights. Each value is ONE short figure line, NOT a paragraph.",
      properties: {
        flights: {
          type: "string",
          description:
            "Max 10 words. e.g. '€120–180 return, Wizz via Lisbon'. If drive-only: 'No flight — ~2h drive'.",
        },
        hotel: {
          type: "string",
          description:
            "Max 12 words — nightly + total, matched to their stay type. e.g. '€80–130/night · ~€2,000 total'.",
        },
        food: { type: "string", description: "Max 9 words. e.g. '~€35–50/day for two'." },
        carRental: {
          type: "string",
          description: "Max 9 words. e.g. '€35/day, worth it' or 'Skip it — walkable'.",
        },
        extras: { type: "string", description: "Max 10 words. e.g. 'Beaches free; wine tastings €15–30'." },
        total: {
          type: "string",
          description: "The all-in total. e.g. '≈ €4,200 solo, 20 nights'.",
        },
      },
      required: ["flights", "hotel", "food", "carRental", "extras", "total"],
      additionalProperties: false,
    },
    affordability: {
      type: "string",
      description: "ONE short line, max 16 words — fits / a stretch, plus the single best money-saving tip.",
    },
    beaches: { type: "string", description: "Max 12 words — the standout beach or nature spot." },
    goodEats: { type: "string", description: "Max 12 words — what to eat + one place." },
    gettingThere: {
      type: "array",
      description: "1–2 options MAX. Include CAR only if genuinely drivable.",
      items: {
        type: "object",
        properties: {
          mode: { type: "string", description: "'Flight', 'Car', 'Bus'…" },
          detail: { type: "string", description: "ONE short line, max 12 words — route + cost + time." },
        },
        required: ["mode", "detail"],
        additionalProperties: false,
      },
    },
    topActivities: {
      type: "array",
      description: "Exactly 3, each max 6 words.",
      items: { type: "string" },
    },
  },
  required: [
    "whyItFits",
    "bestTime",
    "costs",
    "affordability",
    "beaches",
    "goodEats",
    "gettingThere",
    "topActivities",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are wandr — a sharp, well-travelled friend. Lay ONE trip on a tray, but TERSE:
the traveler scans this in 10 seconds. Every field is ONE short line — figures, not paragraphs. No essays,
no repetition, no filler. Voice: relaxed, "you/your".

Cost it honestly for the party (Solo=1, Partner=2, Family≈4, Friends≈4) and the nights between their dates.
Match the stay to their 'stay' answer (resort = food covered; villa = whole-place price; hotel/apartment/
boutique = nightly + total). Ranges are fine. Include a CAR only if genuinely drivable; for far places,
flights only; for a nearby drive-only trip say "No flight — drive" in flights. Put the single best
money-saving tip in affordability. Keep everything SHORT.`;

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Missing ANTHROPIC_API_KEY." }, { status: 500 });
  }

  try {
    const { answers, destination } = await request.json();
    const client = new Anthropic();
    const from = answers?.from || "my city";

    // Haiku 4.5 — fast + cheap; cost estimates are mechanical work it handles
    // well. (Haiku rejects the `effort` param, so we pass only `format`.)
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `My chosen destination: ${destination?.name}, ${destination?.country}.\n\nMy answers:\n\n${JSON.stringify(
            answers,
            null,
            2,
          )}\n\nI'm leaving from ${from}. Lay out exactly what THIS trip costs, whether it fits my budget, and how to get there from ${from}.`,
        },
      ],
    });

    const block = res.content.find((b) => b.type === "text");
    if (!block) throw new Error("No details came back.");
    return Response.json(JSON.parse(block.text));
  } catch (err) {
    console.error("Details API error:", err);
    return Response.json(
      { error: err?.message || "Could not load details." },
      { status: 500 },
    );
  }
}
