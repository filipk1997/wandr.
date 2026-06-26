// Mock destination database for wandr.
// Replace this module with a real data source (DB / CMS) later — the engine
// only depends on the `Destination` shape, not on where the data comes from.

import type { Destination, MonthlyWeather, WeatherProfile } from "./types";

/** Tiny helper to keep the 12-month weather arrays readable. */
const w = (avgTempC: number, rainMm: number, profile: WeatherProfile): MonthlyWeather => ({
  avgTempC,
  rainMm,
  profile,
});

export const DESTINATIONS: Destination[] = [
  {
    id: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    blurb: "Sun-washed Atlantic capital of tiled hills, trams and seafood.",
    weather: [
      w(11, 110, "mild"), w(12, 90, "mild"), w(14, 60, "mild"), w(16, 60, "mild"),
      w(18, 45, "mild"), w(21, 15, "mild"), w(24, 5, "hot"), w(25, 5, "hot"),
      w(23, 30, "hot"), w(19, 80, "mild"), w(14, 110, "mild"), w(12, 120, "mild"),
    ],
    culinary: { foodScene: 8, wineRegion: 6, wineStyle: "commercial" },
    vibe: { popularity: 78, tag: "popular" },
    transit: { options: ["train", "bike_friendly"], trainConnectivity: 7, bikeNetwork: 5, scenicDrives: 6, trafficCongestion: 6 },
    baseAppeal: 8,
  },
  {
    id: "piedmont",
    name: "Piedmont (Alba)",
    country: "Italy",
    blurb: "Rolling Barolo vineyards, truffles and tiny family-run wineries.",
    weather: [
      w(2, 40, "cold"), w(4, 40, "cold"), w(9, 60, "mild"), w(13, 90, "mild"),
      w(17, 110, "mild"), w(21, 80, "mild"), w(24, 60, "hot"), w(23, 70, "hot"),
      w(19, 70, "mild"), w(13, 90, "mild"), w(7, 90, "cold"), w(3, 50, "cold"),
    ],
    culinary: { foodScene: 9, wineRegion: 10, wineStyle: "boutique" },
    vibe: { popularity: 42, tag: "underrated" },
    transit: { options: ["train", "car_rent"], trainConnectivity: 5, bikeNetwork: 4, scenicDrives: 9, trafficCongestion: 2 },
    baseAppeal: 8,
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    blurb: "Temples, kaiseki cuisine and impeccable rail — but tourist-dense.",
    weather: [
      w(5, 50, "cold"), w(6, 70, "cold"), w(9, 110, "mild"), w(15, 130, "mild"),
      w(20, 150, "mild"), w(24, 250, "hot"), w(28, 220, "hot"), w(29, 130, "hot"),
      w(25, 180, "hot"), w(19, 120, "mild"), w(13, 70, "mild"), w(8, 50, "cold"),
    ],
    culinary: { foodScene: 9, wineRegion: 2, wineStyle: "none" },
    vibe: { popularity: 88, tag: "popular" },
    transit: { options: ["train", "bike_friendly"], trainConnectivity: 10, bikeNetwork: 7, scenicDrives: 5, trafficCongestion: 6 },
    baseAppeal: 9,
  },
  {
    id: "san_sebastian",
    name: "San Sebastián",
    country: "Spain",
    blurb: "Pintxos, Michelin stars and txakoli on a walkable Basque bay.",
    weather: [
      w(9, 120, "cold"), w(9, 100, "cold"), w(11, 90, "mild"), w(12, 120, "mild"),
      w(15, 90, "mild"), w(18, 70, "mild"), w(21, 60, "mild"), w(22, 75, "hot"),
      w(20, 90, "mild"), w(17, 130, "mild"), w(12, 150, "cold"), w(10, 140, "cold"),
    ],
    culinary: { foodScene: 10, wineRegion: 5, wineStyle: "boutique" },
    vibe: { popularity: 62, tag: "popular" },
    transit: { options: ["train", "bike_friendly"], trainConnectivity: 7, bikeNetwork: 9, scenicDrives: 7, trafficCongestion: 4 },
    baseAppeal: 8,
  },
  {
    id: "kakheti",
    name: "Kakheti",
    country: "Georgia",
    blurb: "Cradle of wine: qvevri cellars, mountain feasts, barely touristed.",
    weather: [
      w(3, 20, "cold"), w(4, 25, "cold"), w(9, 30, "mild"), w(14, 55, "mild"),
      w(19, 80, "mild"), w(23, 75, "hot"), w(26, 45, "hot"), w(26, 45, "hot"),
      w(21, 40, "mild"), w(14, 40, "mild"), w(9, 35, "cold"), w(5, 25, "cold"),
    ],
    culinary: { foodScene: 8, wineRegion: 9, wineStyle: "boutique" },
    vibe: { popularity: 30, tag: "underrated" },
    transit: { options: ["car_rent"], trainConnectivity: 3, bikeNetwork: 2, scenicDrives: 8, trafficCongestion: 6 },
    baseAppeal: 7,
  },
  {
    id: "ljubljana",
    name: "Ljubljana",
    country: "Slovenia",
    blurb: "Green, bike-first capital with day-trips to lakes and small wineries.",
    weather: [
      w(0, 60, "cold"), w(2, 55, "cold"), w(7, 80, "mild"), w(11, 100, "mild"),
      w(16, 110, "mild"), w(19, 140, "mild"), w(21, 120, "hot"), w(21, 130, "hot"),
      w(16, 130, "mild"), w(11, 140, "mild"), w(5, 120, "cold"), w(1, 90, "cold"),
    ],
    culinary: { foodScene: 6, wineRegion: 6, wineStyle: "boutique" },
    vibe: { popularity: 38, tag: "underrated" },
    transit: { options: ["train", "bike_friendly", "car_rent"], trainConnectivity: 7, bikeNetwork: 9, scenicDrives: 8, trafficCongestion: 3 },
    baseAppeal: 7,
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    blurb: "World-class cycling and canals — popular, busy, car-hostile.",
    weather: [
      w(3, 70, "cold"), w(3, 55, "cold"), w(6, 65, "cold"), w(9, 45, "mild"),
      w(13, 60, "mild"), w(16, 70, "mild"), w(18, 75, "mild"), w(18, 75, "mild"),
      w(15, 80, "mild"), w(11, 90, "mild"), w(7, 85, "cold"), w(4, 80, "cold"),
    ],
    culinary: { foodScene: 7, wineRegion: 1, wineStyle: "none" },
    vibe: { popularity: 92, tag: "popular" },
    transit: { options: ["train", "bike_friendly"], trainConnectivity: 9, bikeNetwork: 10, scenicDrives: 3, trafficCongestion: 8 },
    baseAppeal: 8,
  },
];
