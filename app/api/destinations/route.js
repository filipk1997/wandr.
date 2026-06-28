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
                  "Nightly price + total for the stay, with board type (all-inclusive / B&B / room-only). For ~30+ nights, a MONTHLY apartment rental.",
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
3. SURPRISE, BUT STAY RELEVANT. Aim for a mix: at least one lesser-known gem they probably haven't
   considered, plus well-loved places when they genuinely fit. Avoid only the most clichéd tourist traps
   when a better-fitting option exists. Quality of fit beats obscurity.
4. EVERYTHING ON A TRAY. Itemise real costs: flights (per person + airline/route), hotel (with board type —
   all-inclusive / B&B / room-only), food (a nice restaurant dinner price AND cheap local eats, or "covered"
   if all-inclusive), car rental, extras, and a realistic TOTAL. Compute for the party (Solo=1, Partner=2,
   Family≈4, Friends≈4) and the number of nights between their dates. For ~30+ nights, price a MONTHLY
   apartment + a short long-stay/visa note. Ranges are perfect — honest and concrete, like a friend would.
   priceFrom = a short, enticing PER-PERSON entry price ("From €X pp"); the big total goes only in costs.total.
5. AFFORDABILITY. Compare the total to their budget; say plainly if it fits or is a stretch, then how to spend
   the budget well (all-inclusive upgrade, nicer hotel, extra nights).
6. GETTING THERE from their departure city: realistic flights; include a CAR option ONLY when the place is
   genuinely drivable from there — for far destinations, don't force a car.
7. Also cover "beaches" (scenery/nature) and "goodEats" so they can picture the whole holiday and want to
   tell their friends.

Pick exactly 3 destinations that genuinely fit. Infer weather from the dates + vibes. Keep each field short.`;

// fetch with a hard timeout so a slow/hung photo lookup never blocks results.
async function fetchT(url, opts = {}, ms = 4000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

// Fetch a real, on-topic photo for a destination. Unsplash (beautiful) if a key
// is set, otherwise Wikipedia (accurate). Returns a URL or null. Never throws.
async function getPhoto(name, country) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (key) {
    try {
      const r = await fetchT(
        `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(
          `${name} ${country}`,
        )}`,
        { headers: { Authorization: `Client-ID ${key}` } },
      );
      if (r.ok) {
        const j = await r.json();
        const u = j.results?.[0]?.urls?.regular;
        if (u) return u;
      }
    } catch {}
  }

  // First real place name only (drop "& Osaka", "(area)", etc.) — avoids
  // falling back to a country page, which on Wikipedia is often just a flag/map.
  const cleanName = name.split(/[(,&/]|\s-\s/)[0].trim();
  for (const title of [cleanName]) {
    try {
      const r = await fetchT(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { "User-Agent": "wandr-travel-app/1.0" } },
      );
      if (r.ok) {
        const j = await r.json();
        let u = j.originalimage?.source || j.thumbnail?.source;
        if (u && j.thumbnail?.source && !j.originalimage?.source) {
          u = u.replace(/\/\d+px-/, "/1024px-");
        }
        if (u) return u;
      }
    } catch {}
  }
  return null;
}

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

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are my answers:\n\n${JSON.stringify(answers, null, 2)}\n\nI'm leaving from ${from}. Give me 3 destinations that genuinely fit ME (use my flight-distance answer for how far), lay out exactly what each costs, tell me if it fits my budget, and how to get there from ${from}.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      throw new Error(
        `No text in response (stop_reason: ${response.stop_reason}). Try again.`,
      );
    }
    const data = JSON.parse(textBlock.text);

    // Attach a real photo to each destination (in parallel).
    if (Array.isArray(data.destinations)) {
      await Promise.all(
        data.destinations.map(async (d) => {
          d.imageUrl = await getPhoto(d.name, d.country);
        }),
      );
    }

    return Response.json(data);
  } catch (err) {
    console.error("Destinations API error:", err);
    return Response.json(
      { error: err?.message || "Something went wrong generating destinations." },
      { status: 500 },
    );
  }
}
