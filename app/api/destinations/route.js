import Anthropic from "@anthropic-ai/sdk";

// Stage 1 is light, so it finishes fast — but keep headroom on Vercel.
export const maxDuration = 30;

// LIGHT teaser schema — just enough to render a card the moment it's ready.
// The heavy cost breakdown is fetched lazily, per-card, from /api/details.
const SCHEMA = {
  type: "object",
  properties: {
    destinations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "City or area name" },
          country: { type: "string" },
          description: {
            type: "string",
            description: "One vivid, enticing sentence selling the place.",
          },
          hook: {
            type: "string",
            description:
              "Half a sentence on why it fits THIS traveler (their vibes/who/notes). Punchy, concrete.",
          },
          priceFrom: {
            type: "string",
            description:
              "Short, enticing entry price PER PERSON — JUST the price, exactly like 'From €420 pp'. Use the affordable end.",
          },
          fit: {
            type: "integer",
            description:
              "Honest match score 0-100 for how well this suits THIS traveler's answers. Use the 80-97 range; reserve 93+ for a near-perfect fit.",
          },
        },
        required: ["name", "country", "description", "hook", "priceFrom", "fit"],
        additionalProperties: false,
      },
    },
  },
  required: ["destinations"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are wandr — a sharp, well-travelled friend who picks the perfect trip for someone.
Right now you ONLY name the 3 destinations and a one-line tease for each (full costs come later).
Voice: relaxed, energetic, "you/your", evocative (dream, escape, discover). No corporate tone.

RULES:
1. THE WHOLE WORLD IS ON THE TABLE — Spain, Italy, Greece, Portugal, Norway, Switzerland, Morocco, Turkey,
   Japan, Mexico, Thailand, anywhere. Match the SCOPE to their "flight" answer:
   - short  → a few hours away (neighbouring countries / short-haul).
   - medium → wider region (most of Europe, North Africa, nearby Asia).
   - anywhere → truly global — Japan, Mexico, Southeast Asia, the Americas all fair game.
   Do NOT default to nearby drive-able places unless their answers clearly point there.
2. DEEPLY TAILORED, NEVER RANDOM. Every pick must visibly reflect their budget, who they travel with,
   their vibes, stay type, and especially their free-text "extras" notes. In "hook", name the specific
   thing it satisfies. If a pick wouldn't clearly delight THIS person, drop it.
   HONOR EXPLICIT WISHES: if their notes name a country or place they'd love (e.g. "love Japan",
   "always wanted Mexico"), at least ONE of the 3 MUST be there — don't substitute a closer alternative.
   If they name a place to SKIP or "already been", never suggest it. If they say "not touristy" / "off
   the beaten path", every pick must honour that (no resort strips, no cruise-port old towns).
3. SURPRISE, BUT STAY RELEVANT. At least 2 of the 3 should be places this traveler probably hasn't
   already considered. ACTIVELY AVOID the over-recommended clichés (Kotor, Dubrovnik, Split, Hvar,
   Santorini, Mykonos, Amalfi/Positano, Venice, Paris, Barcelona) UNLESS the traveler explicitly names
   them — and never route "via" one of them either. Skip them entirely if their notes hint at "not
   touristy" / "off the beaten path". Boring/obvious is a fail.
4. priceFrom = a realistic, enticing PER-PERSON entry price ("From €X pp"), honest for their dates,
   party size and stay type. Match their budget.

Pick exactly 3 destinations that genuinely fit. Keep every field short.`;

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it to .env.local and restart the server." },
      { status: 500 },
    );
  }

  try {
    const answers = await request.json();
    const client = new Anthropic();
    const from = answers.from || "my city";

    // Stream the light output so each card pops the moment it finishes.
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are my answers:\n\n${JSON.stringify(answers, null, 2)}\n\nI'm leaving from ${from}. Name 3 destinations that genuinely fit ME (use my flight-distance answer for how far), each with a one-line tease and an enticing 'From €X pp' price.`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Destinations API error:", err);
    return Response.json(
      { error: err?.message || "Something went wrong generating destinations." },
      { status: 500 },
    );
  }
}
