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
          allIn: {
            type: "string",
            description:
              "The reassuring ALL-IN total for the whole party (Solo=1, Partner=2, Family≈4, Friends≈4) for their nights — flights + stay + food + car + activities, one honest ballpark. Exactly like '≈ €1,250 all-in for two'. Short; this is the emotional 'everything sorted' number.",
          },
          fit: {
            type: "integer",
            description:
              "Honest match score 0-100 for how well this suits THIS traveler's answers. Use the 80-97 range; reserve 93+ for a near-perfect fit.",
          },
          originAirport: {
            type: "string",
            description:
              "Lowercase IATA code of the departure city's main airport (e.g. 'skp' for Skopje, 'lhr' for London). Empty string if you truly can't map it.",
          },
          airport: {
            type: "string",
            description:
              "Lowercase IATA code of the nearest sensible airport for THIS destination (e.g. 'bcn' for Barcelona, 'tia' for anywhere near Tirana). EMPTY STRING if this is a drive-only trip with no real flight (e.g. a village a couple hours from the departure city).",
          },
        },
        required: [
          "name",
          "country",
          "description",
          "hook",
          "priceFrom",
          "allIn",
          "fit",
          "originAirport",
          "airport",
        ],
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
1. MATCH THEIR CHOSEN REGIONS. Their "region" answer lists the parts of the world calling them:
   balkans (Macedonia — Ohrid, Krushevo, Mavrovo, Berovo —, Croatia, Montenegro, Slovenia, Albania,
   Bosnia, Serbia), mediterranean (Spain/Italy/Greece/Portugal), alpine (Alps/Dolomites/Tatras),
   nordic (Scandinavia/Iceland), sun_ancient (Morocco/Turkey/Egypt/Jordan), far_east (Japan/Korea/
   Vietnam), tropical (SE Asia/Caribbean/Mexico), americas (USA/Latin America). Pick ONLY inside the
   regions they chose. If they chose "surprise" (or left it empty), the WHOLE WORLD is on the table.
   For a pick inside Macedonia from a Macedonian departure city there's no flight — it's a car/bus escape.
2. HONOR THE "discovery" SLIDER (0-100): 0 = famous, iconic, bucket-list places; 100 = deep
   off-the-beaten-path hidden gems almost nobody names. The higher it is, the harder you avoid anything
   touristy and the more you reward lesser-known finds.
3. MATCH THE "weather" WANT (hot / mild / cool / snow / any) to the destination's climate ON THEIR DATES.
4. DEEPLY TAILORED, NEVER RANDOM. Every pick must visibly reflect their budget, who they travel with,
   their vibes, stay type, and especially their free-text "extras" notes. In "hook", name the specific
   thing it satisfies. If a pick wouldn't clearly delight THIS person, drop it.
   HONOR EXPLICIT WISHES: if their notes name a country or place they'd love (e.g. "love Japan",
   "always wanted Mexico"), at least ONE of the 3 MUST be there. If they name a place to SKIP or
   "already been", never suggest it.
5. SURPRISE, BUT STAY RELEVANT. Within their regions, at least 2 of the 3 should be places this traveler
   probably hasn't already considered. ACTIVELY AVOID the over-recommended clichés (Kotor, Dubrovnik,
   Split, Hvar, Santorini, Mykonos, Amalfi/Positano, Venice, Paris, Barcelona) UNLESS they explicitly
   name them — and never route "via" one of them. The higher the discovery slider, the more ruthless
   this is. Boring/obvious is a fail.
6. priceFrom = a realistic, enticing PER-PERSON entry price ("From €X pp"), honest for their dates,
   party size and budget.

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
