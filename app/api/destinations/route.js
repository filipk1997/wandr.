import Anthropic from "@anthropic-ai/sdk";

// Give the AI room to think + the serverless function room to finish on Vercel.
export const maxDuration = 60;

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
          name: { type: "string", description: "City or area name" },
          country: { type: "string" },
          description: {
            type: "string",
            description: "One vivid sentence selling the place.",
          },
          whyHidden: {
            type: "string",
            description:
              "Why this is an under-the-radar gem, not an obvious tourist trap. 1 sentence.",
          },
          whyItFits: {
            type: "string",
            description: "Why it matches this traveler's answers. 1 sentence.",
          },
          bestTime: {
            type: "string",
            description: "Best time to visit + what the weather is like then.",
          },
          costs: {
            type: "object",
            description:
              "The trip economics, itemised. For the whole party + number of nights from their dates. Approximate ranges are great.",
            properties: {
              flights: {
                type: "string",
                description:
                  "Round-trip flight ballpark per person + likely airline/route, e.g. 'Skopje→Dalaman ~€150 pp return (Wizz, late Sep)'.",
              },
              hotel: {
                type: "string",
                description:
                  "Nightly price + total for the stay, with board type (all-inclusive / B&B / room-only), e.g. 'All-inclusive 4★ ~€110/night for two = ~€550 for 5 nights'.",
              },
              food: {
                type: "string",
                description:
                  "If not all-inclusive: a nice restaurant dinner price, cheap/local eats price, and a rough daily food budget. If all-inclusive, say food is mostly covered.",
              },
              carRental: {
                type: "string",
                description:
                  "Per-day rental ballpark + whether it's worth it, e.g. '~€30/day, worth it for beach-hopping'.",
              },
              extras: {
                type: "string",
                description:
                  "Activities, boat trips, entries — rough cost. Note when most beaches/sights are free.",
              },
              total: {
                type: "string",
                description:
                  "Realistic TOTAL for the whole party for the trip, flights included, e.g. '≈ €1,300 for two, 5 nights, all in'.",
              },
            },
            required: ["flights", "hotel", "food", "carRental", "extras", "total"],
            additionalProperties: false,
          },
          affordability: {
            type: "string",
            description:
              "Verdict vs their budget: comfortably within / a stretch — AND how to spend the budget well (e.g. upgrade to all-inclusive, a nicer hotel, an extra night).",
          },
          beaches: {
            type: "string",
            description: "Notable beaches / nature spots worth it here.",
          },
          goodEats: {
            type: "string",
            description:
              "The food scene: what to eat, a nice restaurant vibe + rough price, local specialties + rough price.",
          },
          gettingThere: {
            type: "array",
            description:
              "1–3 realistic ways to get there from the departure city. Include a CAR option when drivable.",
            items: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  description: "Short mode, e.g. 'Flight', 'Car', 'Bus', 'Ferry'.",
                },
                detail: {
                  type: "string",
                  description: "Route + rough cost + time.",
                },
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
          "whyHidden",
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
      },
    },
  },
  required: ["destinations"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are wandr — a sharp, well-travelled friend who tips people off to places they DON'T already know,
then lays out the whole trip on a tray so they can see exactly what it costs and whether they can afford it.
Voice: relaxed, energetic, "you/your", evocative (dream, escape, discover). No corporate tone.

NON-NEGOTIABLE RULES:
1. AVOID THE OBVIOUS. Do NOT recommend famous, heavily-touristed, "everyone-already-knows-it" places
   (e.g. Kotor, Dubrovnik, Ljubljana, Santorini, Venice, Paris, Barcelona). The traveler can Google those.
   Pick lesser-known, under-the-radar spots that are genuinely beautiful — the kind a well-travelled local
   friend would whisper to you. Surprise them with places they wouldn't find themselves.
2. PUT EVERYTHING ON A TRAY. Itemise the real cost: flights, hotel (with board type — all-inclusive / B&B /
   room-only), food (a nice restaurant dinner price AND cheap local eats price, or "covered" if all-inclusive),
   car rental, extras, and a realistic TOTAL. Compute for the party size (Solo = 1, Partner = 2, Family ≈ 4,
   Friends ≈ 4) and the trip length (tripLength: weekend ≈ 2 nights, long_weekend ≈ 4, week ≈ 7,
   two_weeks ≈ 14, month_plus ≈ 30+). For a month or more, price a MONTHLY apartment rental (far cheaper per
   night than a hotel) and add a short long-stay/visa note; for short trips use nightly hotel pricing.
   Scale EVERY cost (hotel, food, car, total) to the trip length. Approximate ranges are perfect — never
   pretend to be exact. Money should feel honest and concrete, the way a friend would actually break it down.
3. AFFORDABILITY. Compare the total to their budget and say plainly if it fits comfortably or is a stretch,
   then how to spend the budget WELL (e.g. "with €2,000 you could go all-inclusive 5★" or "add 2 nights").
   When a beach-resort destination suits them, offer an all-inclusive option and note food is then covered.
4. HOW TO GET THERE, REALISTICALLY, from their departure city. From the Balkans (e.g. Skopje), budget carriers
   like Wizz Air fly cheap to Turkey/Italy; ALWAYS include a CAR option when the place is drivable (drive time
   + rough fuel/toll cost) — many people prefer to drive. Add bus/ferry when it's a real cheap option.
5. Also cover the stuff that makes a trip ("beaches", "goodEats") so they can picture cheap flights + nice
   hotel + rent-a-car + nice beaches + great local food — and want to tell their friends about it.

Pick exactly 3 varied, NON-OBVIOUS destinations that fit the answers. Infer weather from the dates + vibes.
Honor the "extras" free-text strongly. Keep each field short and punchy.`;

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
    const from = answers.from || "my city";

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 12000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are my answers:\n\n${JSON.stringify(answers, null, 2)}\n\nI'm leaving from ${from}. Surprise me with 3 lesser-known but beautiful places, lay out exactly what each trip costs (flights, hotel, food, car, total), tell me if it fits my budget, and how to get there from ${from} (flight AND by car when it makes sense).`,
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
