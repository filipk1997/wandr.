// Pure, stateless scoring helpers — one per filter dimension.
// Every function returns a normalised score in [0, 1]; weather can also flag a
// hard removal. None of this code knows anything about React or the engine.

import type { Destination, TransitProfile } from "./types";

export const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const average = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export interface DimensionScore {
  /** Normalised satisfaction, 0–1. */
  score: number;
  /** When true the destination should be dropped outright (e.g. winter). */
  hardFail?: boolean;
}

/** Which transit modes the user ticked. */
export interface TransitWants {
  train: boolean;
  car: boolean;
  bike: boolean;
}

/**
 * "Warm & sunny" for the selected month.
 * Cold months are removed; heavy rain heavily reduces the score; genuine
 * summer heat gets a small boost.
 */
export function scoreWarmWeather(dest: Destination, month: number): DimensionScore {
  const w = dest.weather[month - 1];
  let score = w.profile === "hot" ? 1 : w.profile === "mild" ? 0.55 : 0.1;

  // Rain dampens the "sunny" feel.
  if (w.rainMm > 180) score *= 0.35;
  else if (w.rainMm > 110) score *= 0.6;
  else if (w.rainMm > 70) score *= 0.85;

  // Temperature shaping.
  if (w.avgTempC >= 24) score = Math.min(1, score + 0.1);
  else if (w.avgTempC < 12) score *= 0.5;

  // True winter (cold + freezing or cold + wet) is a hard removal.
  const hardFail = w.profile === "cold" && (w.avgTempC < 10 || w.rainMm > 110);
  return { score: clamp01(score), hardFail };
}

/** Off-the-beaten-path bias: boost hidden gems, penalise commercial centres. */
export function scoreUnderrated(dest: Destination): DimensionScore {
  let score = (100 - dest.vibe.popularity) / 100;
  if (dest.vibe.tag === "underrated") {
    score = score * 1.25 + 0.15; // aggressively boost the hidden gems
  } else {
    score *= 0.55; // strongly penalise mass-tourism hotspots
  }
  return { score: clamp01(score) };
}

/** Explicitly wants the lively, popular hotspots. */
export function scorePopular(dest: Destination): DimensionScore {
  let score = dest.vibe.popularity / 100;
  if (dest.vibe.tag === "popular") score += 0.1;
  return { score: clamp01(score) };
}

/** General food / restaurant scene. */
export function scoreFood(dest: Destination): DimensionScore {
  return { score: clamp01(dest.culinary.foodScene / 10) };
}

/** Wine, favouring boutique / artisan regions over commercial giants. */
export function scoreWine(dest: Destination): DimensionScore {
  const c = dest.culinary;
  let score: number;
  if (c.wineStyle === "boutique") score = (c.wineRegion / 10) * 1.2 + 0.1;
  else if (c.wineStyle === "commercial") score = (c.wineRegion / 10) * 0.5;
  else score = 0.05;
  return { score: clamp01(score) };
}

// --- Transit sub-scores -----------------------------------------------------

function railScore(t: TransitProfile): number {
  const available = t.options.includes("train") ? 1 : 0.4;
  return clamp01((t.trainConnectivity / 10) * available);
}

function bikeScore(t: TransitProfile): number {
  const available = t.options.includes("bike_friendly") ? 1 : 0.4;
  return clamp01((t.bikeNetwork / 10) * available);
}

function carScore(t: TransitProfile): number {
  // Scenic road-trips reward; megacity gridlock penalises.
  let s = t.scenicDrives / 10 - t.trafficCongestion / 20;
  if (!t.options.includes("car_rent")) s *= 0.5;
  return clamp01(s);
}

/**
 * Combined transit score across the active mobility filters.
 *
 * Conflict resolution — when BOTH train and car_rent are ticked we don't just
 * average them. We compute a hybrid that favours regions you can reach easily
 * by rail but where a car genuinely unlocks the surrounding boutique
 * day-trips, with a bonus for that sweet spot (good rail AND scenic drives).
 */
export function scoreTransit(dest: Destination, wants: TransitWants): DimensionScore {
  const t = dest.transit;
  const rail = railScore(t);
  const car = carScore(t);
  const bike = bikeScore(t);

  if (wants.train && wants.car) {
    let hybrid = 0.6 * rail + 0.4 * car;
    if (t.trainConnectivity >= 6 && t.scenicDrives >= 6) hybrid += 0.1;
    const parts = [hybrid];
    if (wants.bike) parts.push(bike);
    return { score: clamp01(average(parts)) };
  }

  const parts: number[] = [];
  if (wants.train) parts.push(rail);
  if (wants.car) parts.push(car);
  if (wants.bike) parts.push(bike);
  return { score: clamp01(average(parts)) };
}
