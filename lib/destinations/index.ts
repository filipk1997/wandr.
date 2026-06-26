// Public API of the destination engine — import from here elsewhere in the app.
//
//   import { getTailoredDestinations, DESTINATIONS, FILTER_IDS } from "@/lib/destinations";

export * from "./types";
export { FILTER_IDS, TRANSIT_FILTER_IDS, type FilterId } from "./filters";
export { getTailoredDestinations } from "./engine";
export { DESTINATIONS } from "./data";
