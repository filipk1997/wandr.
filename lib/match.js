// wandr — deterministic matching engine (NO AI).
// Every result comes from the bundled places DB. Pure functions: given the
// quiz answers + the places array, return 3 scored, diversified results.
// No fabrication — we only ever surface fields that exist in the DB.

// ── Quiz "dreaming of" cards → DB tags/vibes (additive scoring only). ──
export const DREAMING_MAP = {
  beach: { tags: ["beach"], vibes: ["beach"] },
  city: { tags: ["nightlife"], vibes: ["city", "party"] },
  culture: { tags: ["history"], vibes: ["culture"] },
  food_wine: { tags: ["foodie", "wine"], vibes: [] },
  nature: { tags: ["hiking"], vibes: ["nature"] },
  relax: { tags: ["wellness"], vibes: ["relax"] },
  adventure: { tags: ["adventure"], vibes: ["adventure"] },
  romance: { tags: ["romantic"], vibes: [] },
  diving: { tags: ["diving"], vibes: [] },
  ski: { tags: ["ski"], vibes: [] },
  wildlife: { tags: ["wildlife"], vibes: ["wildlife"] },
};

// Budget screen → per-person midpoint (€) used for stay-capacity + flight sanity.
const BUDGET_MIDPOINT = {
  "Under €500": 350,
  "€500 – €1,500": 1000,
  "€1,500 – €3,000": 2250,
  "€3,000+": 4000,
};

// who → the guest count used across booking links.
export const PARTY_SIZE = { Solo: 1, Partner: 2, Family: 4, Friends: 4 };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FAME_WORD = {
  0: "world-famous",
  1: "well-loved",
  2: "local-secret",
  3: "under-the-radar",
};

const WHO_WORD = {
  Solo: "solo travellers",
  Partner: "couples",
  Family: "families",
  Friends: "groups of friends",
};

const DREAM_WORD = {
  beach: "beach",
  city: "nightlife",
  culture: "culture",
  food_wine: "food & wine",
  nature: "nature",
  relax: "wellness",
  adventure: "adventure",
  romance: "romance",
  diving: "diving",
  ski: "skiing",
  wildlife: "wildlife",
};

// ── helpers ──
function diffDays(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  const n = Math.round((d2 - d1) / 86400000);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function monthOf(dateStr) {
  if (!dateStr) return null;
  const m = new Date(dateStr).getMonth();
  return Number.isFinite(m) ? m + 1 : null; // 1–12
}

function maskHas(mask, month) {
  return month ? (mask & (1 << (month - 1))) !== 0 : false;
}

const SUMMER = (1 << 5) | (1 << 6) | (1 << 7); // Jun, Jul, Aug
const WINTER = (1 << 11) | (1 << 0) | (1 << 1) | (1 << 2); // Dec, Jan, Feb, Mar

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Rough per-person return flight estimate from great-circle distance — used only
// to sanity-penalize destinations a budget clearly can't reach. Real "from €X"
// prices come from Travelpayouts at render time, never from this.
function roughFlightEst(originCoords, p) {
  if (!originCoords) return 120; // fallback per spec
  const km = haversineKm(originCoords.lat, originCoords.lon, p.lat, p.lon);
  if (km < 250) return 0; // drivable
  return Math.min(1500, Math.max(50, 40 + km * 0.055));
}

// ── derive shared trip context from the answers ──
export function deriveContext(answers) {
  const dates = answers?.dates || {};
  const nights = dates.start && dates.end ? diffDays(dates.start, dates.end) || 7 : 7;
  const month = monthOf(dates.start);
  const budgetPP = BUDGET_MIDPOINT[answers?.budget] ?? 1000;

  // Single stay-capacity level (spec §3.5) using the fallback flight est.
  const stayCapacity = ((budgetPP - 120) * 2) / nights;
  const level =
    stayCapacity < 60 ? "budget" : stayCapacity <= 150 ? "mid-range" : "premium";

  // Origin coords, when the quiz captured a structured city (autocomplete).
  const from = answers?.from;
  const originCoords =
    from && typeof from === "object" && Number.isFinite(from.lat)
      ? { lat: from.lat, lon: from.lon }
      : null;

  return { nights, month, budgetPP, level, originCoords };
}

// ── score one place ──
function scorePlace(p, answers, ctx, sliderTarget) {
  const dreaming = Array.isArray(answers?.vibe) ? answers.vibe : [];
  const wantTags = new Set();
  const wantVibes = new Set();
  for (const d of dreaming) {
    const m = DREAMING_MAP[d];
    if (!m) continue;
    m.tags.forEach((t) => wantTags.add(t));
    m.vibes.forEach((v) => wantVibes.add(v));
  }

  let s = 0;
  const tags = p.tags || [];
  for (const t of wantTags) if (tags.includes(t)) s += 3;
  if (wantVibes.has(p.vibe)) s += 2.4;

  const who = answers?.who;
  if (who && (p.good_for || "").toLowerCase().includes((WHO_KEY[who] || "").toLowerCase()))
    s += 2;

  // month / season
  if (ctx.month) s += maskHas(p.months_mask, ctx.month) ? 1.4 : -1.1;

  // weather
  const weather = answers?.weather;
  if (weather === "hot") {
    s += Math.abs(p.lat) < 30 || (p.months_mask & SUMMER) ? 0.8 : 0;
  } else if (weather === "cool" || weather === "snow") {
    s += p.months_mask & WINTER || tags.includes("ski") ? 0.8 : 0;
  }

  // budget
  s += p.budget_level === ctx.level ? 1.2 : -0.3;
  const flightEst = roughFlightEst(ctx.originCoords, p);
  if (flightEst > ctx.budgetPP) s -= 3;

  // fame slider
  s += 1.9 * (1 - Math.abs(sliderTarget - p.fame) / 3);

  s += Math.random() * 0.15; // gentle tie-break variety
  return s;
}

// good_for uses plural nouns ("couples; families"); map the who value to its key.
const WHO_KEY = {
  Solo: "solo",
  Partner: "couples",
  Family: "families",
  Friends: "friends",
};

// ── honest % match: how many selected criteria this place satisfies ──
function matchPct(p, answers, ctx) {
  const dreaming = Array.isArray(answers?.vibe) ? answers.vibe : [];
  let total = 0;
  let hit = 0;
  const tags = p.tags || [];

  for (const d of dreaming) {
    total++;
    const m = DREAMING_MAP[d];
    if (m && (m.tags.some((t) => tags.includes(t)) || m.vibes.includes(p.vibe))) hit++;
  }
  if (answers?.who) {
    total++;
    if ((p.good_for || "").toLowerCase().includes((WHO_KEY[answers.who] || "").toLowerCase()))
      hit++;
  }
  if (answers?.weather && answers.weather !== "any") {
    total++;
    if (answers.weather === "hot" && (Math.abs(p.lat) < 30 || p.months_mask & SUMMER)) hit++;
    else if (
      (answers.weather === "cool" || answers.weather === "snow") &&
      (p.months_mask & WINTER || tags.includes("ski"))
    )
      hit++;
    else if (answers.weather === "mild") hit++; // temperate — treat as satisfied
  }
  if (answers?.budget) {
    total++;
    if (p.budget_level === ctx.level) hit++;
  }
  if (ctx.month) {
    total++;
    if (maskHas(p.months_mask, ctx.month)) hit++;
  }

  if (total === 0) return 75;
  const ratio = hit / total;
  return Math.max(58, Math.min(99, Math.round(ratio * 100)));
}

// ── rule-based "why it fits" (no LLM, no comparative claims) ──
function whyItFits(p, answers, ctx, variantSeed) {
  const dreaming = Array.isArray(answers?.vibe) ? answers.vibe : [];
  const matchedDreams = dreaming
    .filter((d) => {
      const m = DREAMING_MAP[d];
      const tags = p.tags || [];
      return m && (m.tags.some((t) => tags.includes(t)) || m.vibes.includes(p.vibe));
    })
    .map((d) => DREAM_WORD[d])
    .filter(Boolean);

  const picks =
    matchedDreams.length === 0
      ? p.vibe
      : matchedDreams.length === 1
        ? matchedDreams[0]
        : matchedDreams.slice(0, 2).join(" + ");

  const fameWord = FAME_WORD[p.fame] || "favourite";
  const whoWord = WHO_WORD[answers?.who] || "travellers";
  const monthWord = ctx.month ? MONTH_NAMES[ctx.month - 1] : null;
  const inSeason = ctx.month && maskHas(p.months_mask, ctx.month);

  const variants = [
    `Matches your ${picks} picks — a ${fameWord} spot for ${whoWord}${
      monthWord ? `, ${inSeason ? `at its best in ${monthWord}` : `open in ${monthWord}`}` : ""
    }.`,
    `Your ${picks} mood, done right — ${fameWord} and made for ${whoWord}${
      inSeason ? `, with ${monthWord} right in its season` : ""
    }.`,
    `Built for ${whoWord} chasing ${picks} — a ${fameWord} pick${
      inSeason ? `, and ${monthWord} is a great time to go` : ""
    }.`,
    `A ${fameWord} ${picks} escape for ${whoWord}${
      monthWord && !inSeason ? ` — note ${monthWord} is quieter here` : ""
    }.`,
  ];
  return variants[variantSeed % variants.length];
}

// ── main entry ──
export function matchDestinations(places, answers) {
  const ctx = deriveContext(answers);
  const selectedRegions = (Array.isArray(answers?.region) ? answers.region : []).filter(
    (r) => r && r !== "surprise",
  );

  // hard pre-filter by region, with a safety relax if it starves the pool
  let pool = selectedRegions.length
    ? places.filter((p) => selectedRegions.includes(p.region))
    : places;
  if (pool.length < 4) pool = places;

  // Discovery is now a 3-way tap (famous/both/hidden) mapping to a fame target.
  // (Legacy numeric slider values still map via the original formula.)
  const FAME_TARGET = { famous: 0.4, both: 1.4, hidden: 2.4 };
  const sliderTarget =
    FAME_TARGET[answers?.discovery] ??
    (typeof answers?.discovery === "number" ? 0.4 + (answers.discovery / 100) * 2.0 : 1.4);

  const scored = pool
    .map((p) => ({ p, score: scorePlace(p, answers, ctx, sliderTarget) }))
    .sort((a, b) => b.score - a.score);

  // diversity: max 1 per country
  const picked = [];
  const usedCountries = new Set();
  for (const item of scored) {
    if (usedCountries.has(item.p.country)) continue;
    picked.push(item);
    usedCountries.add(item.p.country);
    if (picked.length >= 3) break;
  }
  // top up if country-diversity left us short
  if (picked.length < 3) {
    for (const item of scored) {
      if (picked.includes(item)) continue;
      picked.push(item);
      if (picked.length >= 3) break;
    }
  }

  // hidden-gem slot: #3 should be the top fame≥2 place within 70% of #1's score,
  // in a country not already used by slots #1/#2. Fall back to the normal #3.
  if (picked.length === 3 && picked[2].p.fame < 2) {
    const top = picked[0].score;
    const firstTwoCountries = new Set(picked.slice(0, 2).map((x) => x.p.country));
    const gem = scored.find(
      (it) =>
        it.p.fame >= 2 &&
        it.score >= 0.7 * top &&
        !firstTwoCountries.has(it.p.country) &&
        it !== picked[0] &&
        it !== picked[1],
    );
    if (gem) picked[2] = gem;
  }

  return picked.slice(0, 3).map((item, i) => {
    const p = item.p;
    return {
      ...p,
      matchPct: matchPct(p, answers, ctx),
      whyItFits: whyItFits(p, answers, ctx, i),
      slot: i + 1,
    };
  });
}
