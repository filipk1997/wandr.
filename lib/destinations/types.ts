// Core data structures for the wandr. destination engine.
// Pure types only — no runtime code, fully UI-framework agnostic.

/** Coarse climate feel for a single month. */
export type WeatherProfile = "hot" | "mild" | "cold";

/** Historical climate averages for one month. */
export interface MonthlyWeather {
  /** Average daytime temperature in °C. */
  avgTempC: number;
  /** Average total precipitation in mm. */
  rainMm: number;
  /** Coarse feel of the month. */
  profile: WeatherProfile;
}

/** How a destination's wine scene is positioned. */
export type WineStyle = "boutique" | "commercial" | "none";

/**
 * Culinary positioning matrix.
 * Deliberately separates a strong general food scene (`foodScene`) from
 * wine-region identity (`wineRegion` + `wineStyle`) so the two filters can
 * pull in different directions.
 */
export interface Culinary {
  /** Strength of the general food / restaurant scene, 0–10. */
  foodScene: number;
  /** Overall wine-region strength, 0–10. */
  wineRegion: number;
  /** Boutique / indie wineries vs commercial giants. */
  wineStyle: WineStyle;
}

export type VibeTag = "popular" | "underrated";

export interface Vibe {
  /** 0 (hidden gem) … 100 (mass-tourism hotspot). */
  popularity: number;
  tag: VibeTag;
}

/** Local mobility modes a destination realistically supports. */
export type TransitOption = "train" | "car_rent" | "bike_friendly";

/** Infrastructure signals used to score the transit filters. */
export interface TransitProfile {
  /** Which mobility modes are realistically available. */
  options: TransitOption[];
  /** Quality of rail connectivity, 0–10. */
  trainConnectivity: number;
  /** Cycling + pedestrian network quality, 0–10. */
  bikeNetwork: number;
  /** Appeal of surrounding scenic / road-trip driving, 0–10. */
  scenicDrives: number;
  /** Megacity gridlock / traffic, 0–10 (higher = worse). */
  trafficCongestion: number;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  blurb: string;
  /** Exactly 12 entries; index 0 = January … index 11 = December. */
  weather: MonthlyWeather[];
  culinary: Culinary;
  vibe: Vibe;
  transit: TransitProfile;
  /** Fallback desirability when no filters are active, 0–10. */
  baseAppeal: number;
}

/** A single filter's contribution to the final blend (for transparency / UI). */
export interface FilterContribution {
  /** Human-readable label of what was evaluated. */
  label: string;
  /** Normalised satisfaction of this filter, 0–1. */
  score: number;
  /** Relative importance of this filter in the blend. */
  weight: number;
}

/** A destination paired with its computed match for the active filters. */
export interface ScoredDestination {
  destination: Destination;
  /** Final match, 0–100 (higher = better fit). */
  matchPercentage: number;
  /** Per-filter contributions behind the score. */
  breakdown: FilterContribution[];
}
