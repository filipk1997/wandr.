// The core engine: turns active filter IDs + a target month into a ranked,
// scored list of destinations. Data-driven and UI-agnostic.

import type {
  Destination,
  ScoredDestination,
  FilterContribution,
} from "./types";
import { FILTER_IDS } from "./filters";
import {
  scoreWarmWeather,
  scoreUnderrated,
  scorePopular,
  scoreFood,
  scoreWine,
  scoreTransit,
  type TransitWants,
} from "./scoring";

interface WeightedDimension {
  label: string;
  score: number;
  weight: number;
  hardFail?: boolean;
}

// Relative weights — climate & vibe dominate slightly over the rest.
const WEIGHTS = {
  weather: 1.3,
  underrated: 1.2,
  popular: 1.0,
  food: 1.0,
  wine: 1.1,
  transit: 0.9,
} as const;

/**
 * Rank destinations against the active multi-select filters.
 *
 * @param activeFilterIds  IDs straight from the checkbox state (see FILTER_IDS).
 * @param targetMonth      Travel month, 1–12.
 * @param destinations     The candidate pool (mock DB today, real source later).
 * @returns                Destinations sorted by descending match percentage.
 */
export function getTailoredDestinations(
  activeFilterIds: string[],
  targetMonth: number,
  destinations: Destination[],
): ScoredDestination[] {
  const active = new Set(activeFilterIds);

  const wants: TransitWants = {
    train: active.has(FILTER_IDS.TRANSIT_TRAIN),
    car: active.has(FILTER_IDS.TRANSIT_CAR_RENT),
    bike: active.has(FILTER_IDS.TRANSIT_BIKE),
  };
  const anyTransit = wants.train || wants.car || wants.bike;

  const scored: ScoredDestination[] = [];

  for (const dest of destinations) {
    const dims: WeightedDimension[] = [];

    if (active.has(FILTER_IDS.WEATHER_WARM)) {
      const r = scoreWarmWeather(dest, targetMonth);
      dims.push({ label: "Warm & sunny", score: r.score, weight: WEIGHTS.weather, hardFail: r.hardFail });
    }
    if (active.has(FILTER_IDS.VIBE_UNDERRATED)) {
      dims.push({ label: "Underrated gem", score: scoreUnderrated(dest).score, weight: WEIGHTS.underrated });
    }
    if (active.has(FILTER_IDS.VIBE_POPULAR)) {
      dims.push({ label: "Popular hotspot", score: scorePopular(dest).score, weight: WEIGHTS.popular });
    }
    if (active.has(FILTER_IDS.CULINARY_FOOD)) {
      dims.push({ label: "Food scene", score: scoreFood(dest).score, weight: WEIGHTS.food });
    }
    if (active.has(FILTER_IDS.CULINARY_WINE)) {
      dims.push({ label: "Boutique wine", score: scoreWine(dest).score, weight: WEIGHTS.wine });
    }
    if (anyTransit) {
      dims.push({ label: "Transit fit", score: scoreTransit(dest, wants).score, weight: WEIGHTS.transit });
    }

    // Hard removals (e.g. asking for warm weather in a destination's winter).
    if (dims.some((d) => d.hardFail)) continue;

    const breakdown: FilterContribution[] = dims.map((d) => ({
      label: d.label,
      score: roundTo(d.score, 2),
      weight: d.weight,
    }));

    scored.push({
      destination: dest,
      matchPercentage: blend(dims, dest.baseAppeal),
      breakdown,
    });
  }

  return scored.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/** Weighted average of the active dimensions → 0–100; falls back to base appeal. */
function blend(dims: WeightedDimension[], baseAppeal: number): number {
  if (dims.length === 0) return Math.round((baseAppeal / 10) * 100);
  const totalWeight = dims.reduce((sum, d) => sum + d.weight, 0);
  const weighted = dims.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight;
  return Math.round(weighted * 100);
}

const roundTo = (n: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};
