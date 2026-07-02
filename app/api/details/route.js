import Anthropic from "@anthropic-ai/sdk";

// Stage 2: the heavy, itemised breakdown for ONE destination, fetched lazily
// when the traveler taps "See details". Small + focused → fast and cheap.
export const maxDuration = 30;

const SCHEMA = {
  type: "object",
  properties: {
    whyItFits: {
      type: "string",
      description:
        "Why this specifically matches THIS traveler's answers (budget, who, vibes, stay, notes). 1–2 sentences, concrete.",
    },
    bestTime: {
      type: "string",
      description: "Best time to visit + what the weather is like then.",
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
            "The stay, MATCHED to their chosen 'stay' type. All-inclusive resort → all-in nightly + total, food covered. Private villa → price the WHOLE villa rental (nightly + total) AND the per-person split. Hotel/apartment/boutique → nightly + total with board type. For ~30+ nights, a MONTHLY rate.",
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
      description:
        "Food scene: what to eat + a nice restaurant and a local specialty with rough prices.",
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

const SYSTEM_PROMPT = `You are wandr — a sharp, well-travelled friend who lays a trip out on a tray:
why it fits YOU, and exactly what it costs. Voice: relaxed, energetic, "you/your". No corporate tone.

You are given ONE chosen destination plus the traveler's full answers. Cost it out HONESTLY:
- Itemise real costs: flights (per person + airline/route), the stay MATCHED to their 'stay' answer
  (all-inclusive resort → food covered; private villa → whole-place price + per-person split; hotel/
  apartment/boutique → nightly + total with board type; ~30+ nights → a MONTHLY rate), food (nice
  restaurant dinner AND cheap local eats, or "covered" if all-inclusive), car rental, extras, and a
  realistic TOTAL. Compute for the party (Solo=1, Partner=2, Family≈4, Friends≈4) and the nights between
  their dates. Ranges are perfect — honest and concrete, like a friend would.
- Affordability: compare the total to their budget; say plainly if it fits or is a stretch, then how to
  spend the budget well.
- Getting there from their departure city: realistic flights; include a CAR option ONLY when genuinely
  drivable from there — for far destinations, don't force a car.
- Also cover beaches/scenery and the food scene so they can picture the whole holiday.
Keep every field short.`;

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
