export const maxDuration = 15;

// fetch with a hard timeout so a slow photo lookup never hangs.
async function fetchT(url, opts = {}, ms = 4000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

// Real photo of the place. Unsplash (beautiful) if a key is set, else Wikipedia.
async function getPhoto(name, country) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (key) {
    try {
      const r = await fetchT(
        `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(
          `${name} ${country}`,
        )}`,
        { headers: { Authorization: `Client-ID ${key}` } },
      );
      if (r.ok) {
        const j = await r.json();
        const u = j.results?.[0]?.urls?.regular;
        if (u) return u;
      }
    } catch {}
  }

  const cleanName = name.split(/[(,&/]|\s-\s/)[0].trim();
  try {
    const r = await fetchT(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`,
      { headers: { "User-Agent": "wandr-travel-app/1.0" } },
    );
    if (r.ok) {
      const j = await r.json();
      let u = j.originalimage?.source || j.thumbnail?.source;
      if (u && !j.originalimage?.source) u = u.replace(/\/\d+px-/, "/1024px-");
      if (u) return u;
    }
  } catch {}

  return null;
}

export async function POST(request) {
  try {
    const { name, country } = await request.json();
    const url = await getPhoto(name || "", country || "");
    return Response.json({ url });
  } catch {
    return Response.json({ url: null });
  }
}
