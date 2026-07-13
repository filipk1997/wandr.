"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── Paywall copy/price in ONE place so it's A/B tunable without touching markup.
const PAYWALL = {
  price: "$3.50",
  eyebrow: "✦ Your matches are ready",
  bullets: [
    "Full costs, day trips & booking links for all 3",
    "Your hidden gem — the off-radar match",
    "Compare side by side, book in one tap",
  ],
  dismiss: "Keep my free match →",
  fineprint: "One-time unlock for this trip · instant access · no subscription",
  pill: (price) => `🔒 Unlock all 3 — ${price}`,
  cta: (price) => `Unlock all 3 escapes — ${price}`,
};

const LOADING_MESSAGES = [
  "Reading your answers…",
  "Matching against 1,200 hand-picked places…",
  "Skipping the tourist traps…",
  "Packing your 3 escapes…",
];

const PARTY_SIZE = { Solo: 1, Partner: 2, Family: 4, Friends: 4 };
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REGION_EMOJI = {
  balkans: "🏖️", med: "🍋", heart_eu: "🏰", nordic: "❄️", sun_ancient: "🐪",
  silk_road: "🗺️", far_east: "🏮", trop_asia: "🌴", africa: "🦁", na: "🗽",
  latin: "🌮", oceania: "🐠",
};
const TYPE_WORD = {
  island: "An island escape",
  old_town: "An old-town escape",
  village: "A village escape",
  city: "A city escape",
};

// Fame is a PERSONALITY label, not a score — a pill, never a number or bar.
const FAME = {
  0: { emoji: "🌟", label: "Iconic favourite", cls: "bg-amber-200 text-amber-900" },
  1: { emoji: "✨", label: "Well-loved classic", cls: "bg-teal-50 text-teal-800" },
  2: { emoji: "🤫", label: "Local secret", cls: "bg-teal-700 text-white" },
  3: { emoji: "💎", label: "Hidden gem", cls: "bg-stone-900 text-yellow-300" },
};

function FameBadge({ fame }) {
  const f = FAME[fame];
  if (!f) return null;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold shadow ${f.cls}`}>
      {f.emoji} {f.label}
    </span>
  );
}

// stay type → Booking.com property-type filter id
const STAY_HT = { resort: 206, apartment: 201, budget: 203, villa: 213, boutique: 204, cabin: 222, farm: 210 };
// budget level → nightly price band (€) for the Booking price filter
const LEVEL_BAND = { budget: [0, 80], "mid-range": [60, 180], premium: [150, 600] };
// budget level → base nightly stay for two (before country multiplier)
const STAY_BASE = { budget: [30, 60], "mid-range": [70, 130], premium: [160, 320] };

const yymmdd = (s) => (s ? s.replaceAll("-", "").slice(2) : "");

function haversineKm(a, b, c, d) {
  if ([a, b, c, d].some((x) => !Number.isFinite(x))) return null;
  const R = 6371, r = (x) => (x * Math.PI) / 180;
  const dLat = r(c - a), dLon = r(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Fallback per-person return flight by distance band (labeled "est.")
function fallbackFlight(originCoords, d) {
  if (!originCoords) return 110;
  const km = haversineKm(originCoords.lat, originCoords.lon, d.lat, d.lon);
  if (km == null) return 110;
  if (km < 800) return 60;
  if (km < 2000) return 110;
  if (km < 5000) return 180;
  return 260;
}

export default function Results() {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [results, setResults] = useState([]);
  const [context, setContext] = useState({});
  const [answers, setAnswers] = useState(null);
  const [error, setError] = useState("");

  const [pro, setPro] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("wandr_pro") === "1") setPro(true);
    } catch {}

    const saved = localStorage.getItem("wandr_answers");
    if (!saved) {
      setStatus("error");
      setError("No quiz answers found. Take the quiz first.");
      return;
    }
    try {
      setAnswers(JSON.parse(saved));
    } catch {}

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: saved,
        });
        const j = await res.json();
        if (!res.ok || j.error) throw new Error(j.error || "Request failed");
        if (cancelled) return;
        setResults(j.results || []);
        setContext(j.context || {});
        setStatus((j.results || []).length ? "done" : "error");
        if (!(j.results || []).length) setError("No matches came back. Try widening your picks.");
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function unlock() {
    // TODO: real Stripe/Paddle checkout goes here. For now we flip state and
    // persist so the unlocked results survive a refresh.
    try {
      localStorage.setItem("wandr_pro", "1");
    } catch {}
    setPro(true);
    setPayOpen(false);
  }

  if (status === "loading") return <LoadingScreen />;

  if (status === "error") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
        <h1 className="font-display text-4xl font-semibold text-stone-800">
          Hmm, that didn&apos;t work.
        </h1>
        <p className="mt-3 text-stone-500">{error}</p>
        <Link href="/quiz" className="mt-6 rounded-full bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800">
          Back to quiz
        </Link>
      </main>
    );
  }

  const locked = results.filter((r) => r.slot >= 2);
  const anyLocked = !pro && locked.length > 0;

  return (
    <main className="flex flex-1 flex-col items-center bg-[#F8FAFC] px-6 py-14">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">Curated for you</p>
      <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-stone-800">
        Your 3 escapes
      </h1>
      <p className="mt-3 max-w-md text-center text-stone-500">
        Hand-picked from a verified database — real places, real day trips, honest prices.
      </p>

      <div className="mt-10 grid w-full max-w-xl gap-10">
        {results.map((d) =>
          d.slot >= 2 && !pro ? (
            <LockedCard key={d.slot} d={d} onOpen={() => setPayOpen(true)} />
          ) : (
            <OpenCard key={d.slot} d={d} answers={answers} context={context} />
          ),
        )}
      </div>

      {/* Persistent unlock pill / single unlock button under the locked cards */}
      {anyLocked && (
        <button
          onClick={() => setPayOpen(true)}
          className="mt-8 rounded-full bg-yellow-300 px-7 py-3 text-sm font-bold text-stone-900 shadow-lg transition hover:bg-yellow-400"
        >
          {PAYWALL.pill(PAYWALL.price)}
        </button>
      )}

      <Link href="/quiz" className="mt-8 rounded-full border border-stone-300 px-7 py-3 font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white">
        Plan another trip
      </Link>

      {payOpen && (
        <Paywall
          locked={locked}
          onUnlock={unlock}
          onClose={() => setPayOpen(false)}
        />
      )}
    </main>
  );
}

function LoadingScreen() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => Math.min(p + 1, LOADING_MESSAGES.length - 1)), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-800 to-teal-600 px-6 text-center">
      <span className="wandr-float absolute left-[12%] top-[22%] text-3xl opacity-70" style={{ animationDelay: "0s" }}>🌴</span>
      <span className="wandr-float absolute right-[14%] top-[28%] text-3xl opacity-70" style={{ animationDelay: "0.6s" }}>☀️</span>
      <span className="wandr-float absolute bottom-[22%] left-[18%] text-3xl opacity-70" style={{ animationDelay: "1.1s" }}>🧭</span>
      <span className="wandr-float absolute bottom-[26%] right-[16%] text-3xl opacity-70" style={{ animationDelay: "1.6s" }}>🏖️</span>
      <h1 className="font-display text-6xl font-semibold tracking-tight text-white">
        wandr<span className="text-yellow-300">.</span>
      </h1>
      <div className="wandr-scene mt-6">
        <svg viewBox="0 0 300 130" className="h-full w-full" fill="none" aria-hidden="true">
          <path d="M18,108 Q150,4 288,64" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />
        </svg>
        <div className="wandr-plane">✈️</div>
      </div>
      <p className="mt-2 font-display text-xl text-white/90">{LOADING_MESSAGES[i]}</p>
    </main>
  );
}

// ── Fully-locked card: blur + %match + one-word teaser + lock pill only.
function LockedCard({ d, onOpen }) {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    let live = true;
    fetch("/api/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name, country: d.country }),
    })
      .then((r) => r.json())
      .then((j) => live && setPhoto(j.url))
      .catch(() => {});
    return () => { live = false; };
  }, [d.name, d.country]);

  const gem = d.slot === 3 && d.fame >= 2;
  const teaser = `${REGION_EMOJI[d.region] || "✨"} ${TYPE_WORD[d.type] || "A hidden escape"}`;

  return (
    <button
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-2xl bg-white text-left shadow-[0_6px_40px_rgba(40,30,15,0.10)] transition hover:shadow-[0_10px_50px_rgba(40,30,15,0.16)]"
    >
      <div className="relative h-64 bg-gradient-to-br from-teal-800 to-teal-600">
        {photo && (
          <img src={photo} alt="A locked match" className="h-64 w-full object-cover blur-[16px] scale-110" />
        )}
        <div className="absolute inset-0 bg-black/45" />
        <span className="absolute left-5 top-4 font-display text-2xl font-semibold text-white/90">
          {String(d.slot).padStart(2, "0")}
        </span>
        {typeof d.matchPct === "number" && (
          <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-teal-800 shadow">
            {d.matchPct}% match
          </span>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          {gem && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold shadow ${FAME[d.fame]?.cls || FAME[3].cls}`}>
              Your hidden gem 🤫
            </span>
          )}
          <p className="font-display text-2xl font-semibold text-white">{teaser}</p>
          <span className="rounded-full bg-white/95 px-4 py-1.5 text-sm font-semibold text-teal-800 shadow transition group-hover:bg-white">
            🔒 Unlock to reveal
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Cost math (all from DB + country-costs + Travelpayouts; fallbacks "est.")
function computeCosts(d, prices, ctx, originCoords) {
  const nights = ctx?.nights || 7;
  const cost = d.cost || null;

  const flightReal = Number.isFinite(prices?.flightFrom) ? prices.flightFrom : null;
  const flight_pp = flightReal ?? fallbackFlight(originCoords, d);
  const flightEst = flightReal == null;

  const base = STAY_BASE[d.budget_level] || STAY_BASE["mid-range"];
  const mult = cost?.stay_mult ?? 1;
  const stayLo = Math.round(base[0] * mult);
  const stayHi = Math.round(base[1] * mult);

  const food = cost?.food_day_for_two_eur || null;
  const car = cost?.car_day_eur || null;

  const foodLo = food ? food[0] : 0;
  const foodHi = food ? food[1] : 0;

  const low = flight_pp * 2 + stayLo * nights + foodLo * nights;
  const high = flight_pp * 2 + stayHi * nights + foodHi * nights;
  const pp = Math.round(low / 2);

  // budget-fit tip vs the user's per-person budget × 2 (card is "for two")
  let tip = null;
  if (ctx?.budgetPP) {
    const partyBudget = ctx.budgetPP * 2;
    const ratio = ((low + high) / 2) / partyBudget;
    tip =
      ratio <= 0.8
        ? "Fits comfortably inside your budget."
        : ratio <= 1.05
          ? "Fits snug at the top of your budget — book the stay early for the best rate."
          : "Runs over your budget — consider fewer nights or shoulder season.";
  }

  return {
    nights, flight_pp, flightEst, stayLo, stayHi,
    stayTotalLo: stayLo * nights, stayTotalHi: stayHi * nights,
    foodLo, foodHi, food: !!food, car, low, high, pp, tip,
  };
}

function OpenCard({ d, answers, context }) {
  const [photo, setPhoto] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [prices, setPrices] = useState(null);

  const dates = answers?.dates || {};
  const adults = PARTY_SIZE[answers?.who] || 2;
  const from = answers?.from;
  const originIata = from && typeof from === "object" ? from.iata : null;
  const originCity = from && typeof from === "object" ? from.city : from || "your city";
  const originCoords =
    from && typeof from === "object" && Number.isFinite(from.lat) ? { lat: from.lat, lon: from.lon } : null;

  useEffect(() => {
    let live = true;
    fetch("/api/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name, country: d.country }),
    })
      .then((r) => r.json())
      .then((j) => live && setPhoto(j.url))
      .catch(() => {});
    return () => { live = false; };
  }, [d.name, d.country]);

  useEffect(() => {
    let live = true;
    fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: d.name, country: d.country, lat: d.lat, lon: d.lon, origin: originIata,
        checkin: dates.start || "", checkout: dates.end || "",
      }),
    })
      .then((r) => r.json())
      .then((j) => live && setPrices(j))
      .catch(() => {});
    return () => { live = false; };
  }, [d.name, d.country, originIata, dates.start, dates.end]);

  const c = computeCosts(d, prices, context, originCoords);
  const destIata = prices?.destIata || null;

  // deep links
  const flightsUrl =
    originIata && destIata && originIata !== destIata
      ? dates.start && dates.end
        ? `https://www.skyscanner.net/transport/flights/${originIata.toLowerCase()}/${destIata.toLowerCase()}/${yymmdd(dates.start)}/${yymmdd(dates.end)}/?adults=${adults}&sub_id=quiz_result_${d.slot}`
        : `https://www.skyscanner.net/transport/flights/${originIata.toLowerCase()}/${destIata.toLowerCase()}/?adults=${adults}&sub_id=quiz_result_${d.slot}`
      : null;

  const stayParams = new URLSearchParams({
    ss: `${d.name}, ${d.country}`, group_adults: String(adults), no_rooms: "1",
    group_children: "0", selected_currency: "EUR", label: `quiz_result_${d.slot}`,
  });
  if (dates.start && dates.end) {
    stayParams.set("checkin", dates.start);
    stayParams.set("checkout", dates.end);
  }
  const stayPicks = Array.isArray(answers?.stay) ? answers.stay : [];
  const htId = stayPicks.map((s) => STAY_HT[s]).find(Boolean);
  const band = LEVEL_BAND[context?.level] || null;
  const nflt = [htId ? `ht_id=${htId}` : null, band ? `price=EUR-${band[0]}-${band[1]}-1` : null].filter(Boolean).join(";");
  if (nflt) stayParams.set("nflt", nflt);
  const hotelsUrl = `https://www.booking.com/searchresults.html?${stayParams.toString()}`;
  const activitiesUrl = (q) => `https://www.getyourguide.com/s/?q=${encodeURIComponent(q)}&sub_id=quiz_result_${d.slot}`;

  // getting there — airport resolved GEOGRAPHICALLY server-side, with guards
  const month = context?.month;
  const inSeason = month ? (d.months_mask & (1 << (month - 1))) !== 0 : null;
  const airportCity = prices?.destCity || d.name;
  const routeRenderable = prices?.routeRenderable;
  const destKm = prices?.destKm;
  const roadLeg = prices?.roadHours ? ` then ~${prices.roadHours}h by road to ${d.name}` : "";

  const dayTrips = (d.day_trips || []).slice(0, 4);
  const topTrip = (d.day_trips || [])[0];

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_6px_40px_rgba(40,30,15,0.10)]">
      {/* 1. Photo header */}
      <div className="relative h-64 bg-gradient-to-br from-teal-800 to-teal-600">
        {photo && !imgError ? (
          <img src={photo} alt={`${d.name}, ${d.country}`} onError={() => setImgError(true)} className="h-64 w-full object-cover" />
        ) : (
          <div className="flex h-64 w-full items-center justify-center">
            <span className="font-display text-8xl font-semibold text-white/90">{d.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
        <span className="absolute left-5 top-4 font-display text-2xl font-semibold text-white/90">
          {String(d.slot).padStart(2, "0")}
        </span>
        <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
          {typeof d.matchPct === "number" && (
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-teal-800 shadow">
              {d.matchPct}% match
            </span>
          )}
          <FameBadge fame={d.fame} />
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/80">{d.country}</p>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight text-white">{d.name}</h2>
        </div>
      </div>

      <div className="space-y-5 p-7">
        {/* 2. Description + 3. Why it fits */}
        <div>
          <p className="font-display text-xl leading-relaxed text-stone-700">{d.description}</p>
          {d.whyItFits && <p className="mt-2 text-sm leading-relaxed text-stone-500">✦ {d.whyItFits}</p>}
        </div>

        {/* 4. All-in banner */}
        <div className="rounded-xl bg-teal-50 px-4 py-3">
          <p className="font-display text-2xl font-semibold text-teal-900">
            ≈ €{c.low.toLocaleString()}–{c.high.toLocaleString()} <span className="text-base font-medium">all-in for two</span>
          </p>
          <p className="mt-0.5 text-sm font-medium text-teal-700">From €{c.pp.toLocaleString()} pp</p>
        </div>

        {/* 5. What it costs */}
        <div>
          <Label>What it costs</Label>
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            <li>
              <span className="font-semibold text-stone-900">Flights:</span> from €{c.flight_pp} return
              {c.flightEst && <span className="text-stone-400"> (est.)</span>}
            </li>
            <li>
              <span className="font-semibold text-stone-900">Stay:</span> €{c.stayLo}–{c.stayHi}/night · ≈€{c.stayTotalLo.toLocaleString()}–{c.stayTotalHi.toLocaleString()} total ({c.nights} nights)
            </li>
            {c.food && (
              <li>
                <span className="font-semibold text-stone-900">Food:</span> ~€{c.foodLo}–{c.foodHi}/day for two — {d.cost.food_line}
              </li>
            )}
            {c.car && (
              <li>
                <span className="font-semibold text-stone-900">Car:</span> €{c.car[0]}–{c.car[1]}/day (optional)
              </li>
            )}
          </ul>
          <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">
            ≈ €{c.low.toLocaleString()}–{c.high.toLocaleString()} for two, {c.nights} nights.
          </p>
        </div>

        {/* 6. Budget-fit tip */}
        {c.tip && (
          <p className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-900">💡 {c.tip}</p>
        )}

        {/* 7. Getting there — only a real route when the airport is sensibly close */}
        {destIata && (
          <div>
            <Label>Getting there</Label>
            {routeRenderable ? (
              <p className="mt-1 text-sm text-stone-700">
                ✈️ {originCity} → {airportCity} ({destIata})
                {!c.flightEst && prices?.flightFrom ? ` · from €${prices.flightFrom}` : ""}
                {roadLeg}
              </p>
            ) : (
              <p className="mt-1 text-sm text-stone-700">
                ✈️ Nearest airport: {destIata}
                {Number.isFinite(destKm) ? ` (${destKm} km)` : ""}
              </p>
            )}
          </div>
        )}

        {/* 8. Highlights box */}
        <div className="space-y-1 rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-stone-600">
          {month ? (
            <p>📅 {MONTHS[month - 1]} — {inSeason ? "inside" : "outside"} {d.name}&apos;s best season ({d.best_season})</p>
          ) : (
            d.best_season && <p>📅 Best season: {d.best_season}</p>
          )}
          {topTrip && <p>🏖️ {topTrip.name} — {topTrip.desc}</p>}
          {d.cost?.food_line && <p>🍴 {d.cost.food_line}</p>}
        </div>

        {/* 9. Don't miss */}
        {dayTrips.length > 0 && (
          <div>
            <Label>Don&apos;t miss</Label>
            <ul className="mt-2 flex flex-wrap gap-2">
              {dayTrips.map((t) => (
                <li key={t.name}>
                  <a href={activitiesUrl(`${t.name}, ${d.country}`)} target="_blank" rel="noopener noreferrer" title={t.desc}
                    className="inline-block rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 transition hover:bg-stone-200">
                    {t.name} · {t.hours}h
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 10. Ready to book */}
        <div className="space-y-2 pt-1">
          <Label>Ready to book?</Label>
          {flightsUrl ? (
            <BookBtn href={flightsUrl} solid>✈️ Search flights</BookBtn>
          ) : (
            <p className="rounded-full bg-stone-100 px-5 py-3 text-center text-sm font-medium text-stone-600">
              ✈️ Add your home city in the quiz for live flights
            </p>
          )}
          <BookBtn href={hotelsUrl}>🏨 Browse stays</BookBtn>
          <BookBtn href={activitiesUrl(`${d.name}, ${d.country}`)}>🎯 Book day trips</BookBtn>
        </div>
      </div>
    </article>
  );
}

function Paywall({ locked, onUnlock, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pct2 = locked[0]?.matchPct;
  const pct3 = locked[1]?.matchPct;
  const pctText =
    pct2 && pct3 ? `${pct2}% and ${pct3}%` : pct2 ? `${pct2}%` : "high";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      onClick={onClose}
    >
      <div
        className="wandr-modal-in w-full max-w-sm rounded-[20px] bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          {PAYWALL.eyebrow}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Two more places scored <span className="font-semibold text-stone-800">{pctText}</span> for you
          — including a hidden gem most travelers never find.
        </p>

        <ul className="mt-4 space-y-2">
          {PAYWALL.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-stone-700">
              <span className="text-teal-600">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onUnlock}
          className="mt-6 w-full rounded-full bg-yellow-300 px-6 py-3.5 font-bold text-stone-900 shadow-lg transition hover:bg-yellow-400"
        >
          {PAYWALL.cta(PAYWALL.price)}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm font-medium text-stone-500 transition hover:text-stone-700"
        >
          {PAYWALL.dismiss}
        </button>

        <p className="mt-4 text-center text-xs text-stone-400">{PAYWALL.fineprint}</p>
      </div>
    </div>
  );
}

function BookBtn({ href, children, solid }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={solid
        ? "block w-full rounded-full bg-teal-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-800"
        : "block w-full rounded-full border border-teal-700 px-5 py-3 text-center text-sm font-semibold text-teal-800 transition hover:bg-teal-50"}>
      {children}
    </a>
  );
}

function Label({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">{children}</p>;
}
