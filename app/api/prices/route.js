import airports from "../../../data/airports.json";
import countryIso from "../../../data/country-iso.json";

export const maxDuration = 15;

// Real, best-effort prices from Travelpayouts (free cached data APIs).
// HARD rule: only ever return figures the APIs actually gave us. If a call
// returns nothing (or TP_TOKEN is unset), we omit that line — never invent it.

const TOKEN = process.env.TRAVELPAYOUTS_TOKEN || process.env.TP_TOKEN || "";

// per-instance 24h cache (data APIs are cached market data anyway)
const cache = new Map();
const DAY = 24 * 60 * 60 * 1000;
function cached(key) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;
  return undefined;
}
function put(key, val) {
  cache.set(key, { val, exp: Date.now() + DAY });
  return val;
}

async function fetchJSON(url, ms = 4500) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

const R = 6371;
const toRad = (x) => (x * Math.PI) / 180;
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Nearest airport BY GEOGRAPHY (min great-circle distance), never by name.
// Uses the bundled Travelpayouts static airports dataset (flightable airports).
function nearestAirport(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let best = null;
  let bestKm = Infinity;
  for (const ap of airports) {
    const km = haversineKm(lat, lon, ap.lat, ap.lon);
    if (km < bestKm) {
      bestKm = km;
      best = ap;
    }
  }
  return best ? { ...best, km: bestKm } : null;
}

async function flightPrice(origin, dest, checkin, checkout) {
  if (!TOKEN || !origin || !dest) return null;
  const key = `fl:${origin}-${dest}-${checkin}-${checkout}`;
  const c = cached(key);
  if (c !== undefined) return c;
  const params = new URLSearchParams({
    origin,
    destination: dest,
    currency: "eur",
    token: TOKEN,
    one_way: "false",
  });
  // Query by month (YYYY-MM) — the cheap cache has far broader coverage by month
  // than by an exact date, so "from €X" resolves reliably.
  if (checkin) params.set("departure_at", checkin.slice(0, 7));
  if (checkout) params.set("return_at", checkout.slice(0, 7));
  const j = await fetchJSON(
    `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params.toString()}`,
  );
  const rows = j?.data;
  if (!Array.isArray(rows) || rows.length === 0) return put(key, null);
  const min = Math.min(...rows.map((r) => r.price).filter((n) => Number.isFinite(n)));
  return put(key, Number.isFinite(min) ? Math.round(min) : null);
}

async function hotelPrice(city, checkin, checkout) {
  if (!city) return null;
  const key = `ht:${city}-${checkin}-${checkout}`;
  const c = cached(key);
  if (c !== undefined) return c;
  const params = new URLSearchParams({ location: city, currency: "eur", limit: "20" });
  if (checkin) params.set("checkIn", checkin);
  if (checkout) params.set("checkOut", checkout);
  if (TOKEN) params.set("token", TOKEN);
  const j = await fetchJSON(`https://engine.hotellook.com/api/v2/cache.json?${params.toString()}`);
  if (!Array.isArray(j) || j.length === 0) return put(key, null);
  const prices = j
    .map((h) => h.priceFrom ?? h.priceAvg)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!prices.length) return put(key, null);
  return put(key, Math.round(Math.min(...prices)));
}

export async function POST(request) {
  try {
    const { name, country, lat, lon, origin, checkin, checkout } = await request.json();

    const ap = nearestAirport(lat, lon);
    const destIata = ap?.iata || null;
    const km = ap ? Math.round(ap.km) : null;

    // ── Getting-there guards (fix absurd cross-sea / cross-region routes) ──
    // 1) If the nearest airport is > 300 km away, don't render a route — just
    //    name the airport. 2) A road leg only when road time ≤ 3h (≤195km @65).
    // 3) Road segment only if airport & place share a country OR distance ≤150km.
    const routeRenderable = ap ? ap.km <= 300 : false;
    let roadHours = null;
    if (ap) {
      const h = ap.km / 65;
      const placeIso = countryIso[country] || null;
      const sameCountry = placeIso && ap.cc && placeIso === ap.cc;
      const roadAllowed = h <= 3 && (sameCountry || ap.km <= 150);
      if (roadAllowed && h > 1) roadHours = Math.round(h);
    }

    const [flightFrom, hotelStay] = await Promise.all([
      flightPrice(origin, destIata, checkin, checkout),
      hotelPrice(name, checkin, checkout),
    ]);

    return Response.json({
      destIata,
      destCity: ap?.city || null,
      destKm: km,
      routeRenderable,
      roadHours, // rounded hours, or null if no sensible road leg
      flightFrom, // per person, return, € — or null
      hotelStay, // Hotellook cache total for the range, € — or null
      currency: "eur",
    });
  } catch {
    return Response.json({
      destIata: null,
      destCity: null,
      destKm: null,
      routeRenderable: false,
      roadHours: null,
      flightFrom: null,
      hotelStay: null,
    });
  }
}
