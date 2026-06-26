// Canonical filter IDs.
// These are the exact strings emitted by the multi-select checkbox state on
// the quiz UI, so the engine consumes `activeFilterIds: string[]` directly
// with zero translation between layers.

export const FILTER_IDS = {
  WEATHER_WARM: "weather_warm",
  VIBE_UNDERRATED: "vibe_underrated",
  VIBE_POPULAR: "vibe_popular",
  CULINARY_FOOD: "culinary_food",
  CULINARY_WINE: "culinary_wine",
  TRANSIT_TRAIN: "transit_train",
  TRANSIT_CAR_RENT: "transit_car_rent",
  TRANSIT_BIKE: "transit_bike_friendly",
} as const;

export type FilterId = (typeof FILTER_IDS)[keyof typeof FILTER_IDS];

/** The subset of filters that describe local transit preferences. */
export const TRANSIT_FILTER_IDS: FilterId[] = [
  FILTER_IDS.TRANSIT_TRAIN,
  FILTER_IDS.TRANSIT_CAR_RENT,
  FILTER_IDS.TRANSIT_BIKE,
];
