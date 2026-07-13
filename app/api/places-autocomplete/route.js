export const maxDuration = 10;

// Origin city autocomplete → structured {city, iata, lat, lon} for the quiz.
// Uses Travelpayouts' free autocomplete (no token needed). If it's ever down,
// the quiz falls back to a plain text city name (no flight prices, plain links).
async function fetchT(url, ms = 4000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function POST(request) {
  try {
    const { term } = await request.json();
    if (!term || term.trim().length < 2) return Response.json({ places: [] });

    const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(
      term.trim(),
    )}&locale=en&types[]=city`;
    const r = await fetchT(url);
    if (!r.ok) return Response.json({ places: [] });
    const arr = await r.json();

    const places = (Array.isArray(arr) ? arr : [])
      .filter((p) => p.code && p.coordinates)
      .slice(0, 6)
      .map((p) => ({
        city: p.name,
        iata: p.code,
        country: p.country_name || "",
        lat: p.coordinates.lat,
        lon: p.coordinates.lon,
      }));
    return Response.json({ places });
  } catch {
    return Response.json({ places: [] });
  }
}
