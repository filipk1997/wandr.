// Mock execution script — not a unit-test framework, just a quick way to
// eyeball how the scoring behaves.
//
//   Run:  npx tsx lib/destinations/engine.test.ts

import { getTailoredDestinations, DESTINATIONS, FILTER_IDS } from "./index";

function run(title: string, filters: string[], month: number): void {
  const monthName = new Date(2000, month - 1, 1).toLocaleString("en", { month: "long" });
  console.log(`\n=== ${title} ===`);
  console.log(`month=${monthName}  filters=[${filters.join(", ")}]`);

  const results = getTailoredDestinations(filters, month, DESTINATIONS);
  if (results.length === 0) {
    console.log("  (no destinations passed the hard filters)");
    return;
  }
  for (const r of results) {
    const why = r.breakdown
      .map((b) => `${b.label} ${Math.round(b.score * 100)}%`)
      .join("  ·  ");
    const name = r.destination.name.padEnd(18);
    console.log(`  ${String(r.matchPercentage).padStart(3)}%  ${name} ${why}`);
  }
}

// 1) Warm beach escape, looking for a hidden gem — July.
run("Warm + underrated · July", [FILTER_IDS.WEATHER_WARM, FILTER_IDS.VIBE_UNDERRATED], 7);

// 2) Boutique-wine foodie trip — September (no weather filter).
run("Boutique wine + food · September", [FILTER_IDS.CULINARY_WINE, FILTER_IDS.CULINARY_FOOD], 9);

// 3) Conflicting transit (train AND car) — hybrid resolution, June.
run("Train + car_rent conflict · June", [FILTER_IDS.TRANSIT_TRAIN, FILTER_IDS.TRANSIT_CAR_RENT], 6);

// 4) Bike-friendly city break in a lively place — May.
run("Bike-friendly + popular · May", [FILTER_IDS.TRANSIT_BIKE, FILTER_IDS.VIBE_POPULAR], 5);

// 5) Warm + wine + train in December — winters get hard-removed.
run("Warm + wine + train · December", [FILTER_IDS.WEATHER_WARM, FILTER_IDS.CULINARY_WINE, FILTER_IDS.TRANSIT_TRAIN], 12);

// 6) No filters — falls back to base appeal.
run("No filters · August", [], 8);
