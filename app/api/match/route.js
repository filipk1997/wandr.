import places from "../../../data/places.json";
import countryCosts from "../../../data/country-costs.json";
import { matchDestinations, deriveContext } from "../../../lib/match.js";

// The result pipeline: NO LLM. Given the quiz answers, run the deterministic
// engine over the bundled, human-curated DB and return 3 diversified picks.
// €0 marginal cost per quiz result.
export const maxDuration = 10;

export async function POST(request) {
  try {
    const answers = await request.json();
    const results = matchDestinations(places, answers).map((r) => ({
      ...r,
      cost: countryCosts[r.country] || null, // curated country cost tier
    }));
    const ctx = deriveContext(answers);
    return Response.json({
      results,
      context: {
        nights: ctx.nights,
        month: ctx.month,
        level: ctx.level,
        budgetPP: ctx.budgetPP,
      },
    });
  } catch (err) {
    console.error("Match API error:", err);
    return Response.json({ error: "Could not match destinations." }, { status: 500 });
  }
}
