import Anthropic from "@anthropic-ai/sdk";

// Give the AI + photo lookups room to finish on Vercel.
export const maxDuration = 60;

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
            description: "One vivid sentence selling the place.",
          },
          whyItFits: {
            type: "string",
            description:
              "Why this specifically matches THIS traveler's answers (budget, who, vibes, pace, notes). 1–2 sentences, concrete.",
          },
          bestTime: {
            type: "string",
            description: "Best time to visit + what the weather is like then.",
          },
          priceFrom: {
            type: "string",
            description:
              "Short, enticing entry price PER PERSON — JUST the price, no extra words, exactly like 'From €420 pp'. Use the affordable end. The big party total goes only in costs.total.",
          },
          costs: {
            type: "object",
            description:
              "Trip economics, itemised for the whole party + number of nights from their dates. Approximate ranges are great.",
            properties: {
              flights: {
                type: "string",
                description:
                  "Round-trip flight ballpark per person + likely airline/route. If they'd drive instead, say so.",
              },
              hotel: {
                type: "string",
                description:
                  "The stay, MATCHED to their chosen 'stay' type. All-inclusive resort → all-in nightly + total, food covered. Private villa → price the WHOLE villa rental (nightly + total) AND the per-person cost split among the party. Hotel/apartment/boutique → nightly + total with board type. For ~30+ nights, a MONTHLY rate.",
              },
              food: {
                type: "string",
                description:
                  "A nice restaurant dinner price, cheap/local eats price, and rough daily food budget. If all-inclusive, say food is mostly covered.",
              },
              carRental: {
                type: "string",
                description: "Per-day rental ballpark + whether it's worth it here.",
              },
              extras: {
                type: "string",
                description: "Activities/entries rough cost. Note when sights/beaches are free.",
              },
              total: {
                type: "string",
                description:
                  "Realistic TOTAL for the whole party, flights included, e.g. '≈ €1,300 for two, 5 nights'.",
              },
            },
            required: ["flights", "hotel", "food", "carRental", "extras", "total"],
            additionalProperties: false,
          },
          affordability: {
            type: "string",
            description:
              "Verdict vs their budget: comfortably within / a stretch — AND how to spend the budget well.",
          },
          beaches: {
            type: "string",
            description: "Notable beaches / nature / scenery worth it here.",
          },
          goodEats: {
            type: "string",
            description: "Food scene: what to eat + a nice restaurant and a local specialty with rough prices.",
          },
          gettingThere: {
            type: "array",
            description:
              "1–3 realistic ways to get there from the departure city. Include CAR only when realistically drivable; for far destinations, flights only.",
            items: {
              type: "object",
              properties: {
                mode: { type: "string", description: "e.g. 'Flight', 'Car', 'Bus', 'Ferry'." },
                detail: { type: "string", description: "Route + rough cost + time." },
              },
              required: ["mode", "detail"],
              additionalProperties: false,
            },
          },
          topActivities: {
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
          "bestTime",
          "priceFrom",
          "costs",
          "affordability",
          "beaches",
          "goodEats",
          "gettingThere",
          "topActivities",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["destinations"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are wandr — a sharp, well-travelled friend who plans the perfect trip and lays the whole thing
on a tray: where to go, why it fits YOU, and exactly what it costs.
Voice: relaxed, energetic, "you/your", evocative (dream, escape, discover). No corporate tone.

RULES:
1. THE WHOLE WORLD IS ON THE TABLE. Spain, Italy, Greece, Portugal, Norway, Switzerland, Morocco, Turkey,
   Japan, Mexico, Thailand, anywhere. Match the SCOPE to their "flight" answer:
   - short  → a few hours away (neighbouring countries / short-haul).
   - medium → wider region (most of Europe, North Africa, nearby Asia).
   - anywhere → truly global — Japan, Mexico, Southeast Asia, the Americas are all fair game.
   Do NOT default to nearby drive-able places unless their answers clearly point there.
2. DEEPLY TAILORED, NEVER RANDOM. Every pick must visibly reflect their budget, who they travel with,
   their vibes, pace, stay type, transit, and especially their free-text "extras" notes. In whyItFits,
   name the specific answers it satisfies. If a pick wouldn't clearly delight THIS person, drop it.
3. SURPRISE, BUT STAY RELEVANT. Lean toward fresh, less-saturated picks — at least 2 of the 3 should be
   places this traveler probably hasn't already considered. ACTIVELY AVOID the over-recommended clichés
   (Kotor, Dubrovnik, Split, Santorini, Mykonos, Amalfi/Positano, Venice, Paris, Barcelona) UNLESS the
   traveler explicitly names them — and never suggest them if their notes hint at "not touristy" or
   "off the beaten path". Quality of fit beats obscurity, but boring/obvious is a fail.
4. EVERYTHING ON A TRAY. Itemise real costs: flights (per person + airline/route), hotel (with board type —
   all-inclusive / B&B / room-only), food (a nice restaurant dinner price AND cheap local eats, or "covered"
   if all-inclusive), car rental, extras, and a realistic TOTAL. Compute for the party (Solo=1, Partner=2,
   Family≈4, Friends≈4) and the number of nights between their dates. For ~30+ nights, price a MONTHLY
   apartment + a short long-stay/visa note. Ranges are perfect — honest and concrete, like a friend would.
   priceFrom = a short, enticing PER-PERSON entry price ("From €X pp"); the big total goes only in costs.total.
   MATCH the stay to their "stay" answer: all-inclusive resort (food covered), a whole PRIVATE VILLA (price the
   entire place + the per-person split — ideal for families/groups), hotel, apartment, or boutique stay.
5. AFFORDABILITY. Compare the total to their budget; say plainly if it fits or is a stretch, then how to spend
   the budget well (all-inclusive upgrade, nicer hotel, extra nights).
6. GETTING THERE from their departure city: realistic flights; include a CAR option ONLY when the place is
   genuinely drivable from there — for far destinations, don't force a car.
7. Also cover "beaches" (scenery/nature) and "goodEats" so they can picture the whole holiday and want to
   tell their friends.

Pick exactly 3 destinations that genuinely fit. Infer weather from the dates + vibes. Keep each field short.`;

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

    // Stream the model output so the client can render each destination the
    // moment it finishes — no waiting for all 3. (Photos load separately.)
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are my answers:\n\n${JSON.stringify(answers, null, 2)}\n\nI'm leaving from ${from}. Give me 3 destinations that genuinely fit ME (use my flight-distance answer for how far), lay out exactly what each costs, tell me if it fits my budget, and how to get there from ${from}.`,
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
