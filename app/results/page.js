"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LOADING_MESSAGES = [
  "Scanning the whole world for you…",
  "Sniffing out hidden gems, skipping the tourist traps…",
  "Pricing flights, stays, food — the whole trip…",
  "Packing your 3 escapes…",
];

const slug = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

// Pull every COMPLETE destination object out of the streaming JSON so we can
// render each card the moment it finishes — without waiting for all three.
function parseStreamed(text) {
  const start = text.indexOf("[");
  if (start < 0) return [];
  const objs = [];
  let depth = 0,
    inStr = false,
    esc = false,
    objStart = -1;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try {
          objs.push(JSON.parse(text.slice(objStart, i + 1)));
        } catch {}
        objStart = -1;
      }
    }
  }
  return objs;
}

// DEV: when NEXT_PUBLIC_WANDR_MOCK=1, results use these samples instead of
// calling the AI — so building/testing the quiz + design costs zero credits.
// Flip the env var off (or unset) to go back to real, live results.
const MOCK = process.env.NEXT_PUBLIC_WANDR_MOCK === "1";

const SAMPLE_DESTINATIONS = [
  {
    name: "Berovo",
    country: "North Macedonia",
    fit: 94,
    description: "Pine-forest calm at 900m — cool air, hand-made cheese, and a lake that mirrors the sky.",
    hook: "A 2-hour drive from Skopje into real highland life, with zero tourists.",
    priceFrom: "From €110 pp",
    allIn: "≈ €380 all-in for two",
    originAirport: "skp",
    airport: "",
  },
  {
    name: "Berat",
    country: "Albania",
    fit: 90,
    description: "A thousand Ottoman windows stacked up a hillside above a river of wine and figs.",
    hook: "Still genuinely off the radar — boutique stone guesthouses, mild September sun.",
    priceFrom: "From €180 pp",
    allIn: "≈ €620 all-in for two",
    originAirport: "skp",
    airport: "tia",
  },
  {
    name: "Mavrovo",
    country: "North Macedonia",
    fit: 88,
    description: "A national park of alpine meadows, a sunken church, and trout straight from the lake.",
    hook: "Nature-and-culture combo under 2 hours by car — cabins in the pines.",
    priceFrom: "From €95 pp",
    allIn: "≈ €340 all-in for two",
    originAirport: "skp",
    airport: "",
  },
];

const SAMPLE_DETAILS = {
  whyItFits:
    "You wanted hidden, mild, and close — this is highland Macedonia at its quietest, an easy drive with no airport hassle.",
  bestTime: "Early September: warm days (~22°C), crisp evenings, empty trails.",
  costs: {
    flights: "No flight — ~2h drive from Skopje (fuel ≈ €25 return for two).",
    hotel: "Boutique guesthouse: €45–70/night for a double, breakfast in. 4 nights ≈ €220.",
    food: "Hearty local dinner €10–15pp; market lunch €4. ~€30/day for two.",
    carRental: "Bring your own or rent ≈ €30/day — worth it to reach the villages.",
    extras: "Lake, trails and monasteries are free; a guided hike ≈ €20pp.",
    total: "≈ €380 for two, 4 nights",
  },
  affordability: "Comfortably within budget — spend the rest on a long lakeside lunch.",
  beaches: "Berovo Lake for calm swims and pedal boats; pine trails all around.",
  goodEats: "Local trout, smoked cheese, and forest-berry rakija at a village konoba.",
  gettingThere: [{ mode: "Car", detail: "Skopje → Berovo ≈ 2h via Kočani, scenic mountain road." }],
  topActivities: ["Lakeside walk", "Cheese-tasting at a highland farm", "Sunrise hike in the pines"],
};

export default function Results() {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [destinations, setDestinations] = useState([]);
  const [answers, setAnswers] = useState(null);
  const [error, setError] = useState("");

  // Unlock gate: once an email is captured, the paid-cost details load.
  const [email, setEmail] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);
  const unlocked = Boolean(email);

  useEffect(() => {
    try {
      const e = localStorage.getItem("wandr_email");
      if (e) setEmail(e);
    } catch {}

    // Mock mode: no API call, no credits — just show the samples.
    if (MOCK) {
      try {
        setAnswers(JSON.parse(localStorage.getItem("wandr_answers") || "{}"));
      } catch {}
      setDestinations(SAMPLE_DESTINATIONS);
      setStatus("done");
      return;
    }

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
    async function run() {
      try {
        const res = await fetch("/api/destinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: saved,
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Request failed");
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (value) {
            text += dec.decode(value, { stream: true });
            const objs = parseStreamed(text);
            if (!cancelled && objs.length) setDestinations(objs);
          }
          if (done) break;
        }
        if (cancelled) return;

        const finalObjs = parseStreamed(text);
        setDestinations(finalObjs);
        if (finalObjs.length) {
          setStatus("done");
        } else {
          setStatus("error");
          setError("No destinations came back. Please try again.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus("error");
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleUnlock(value) {
    try {
      localStorage.setItem("wandr_email", value);
    } catch {}
    // Save the email (fire-and-forget — never block the unlock on it).
    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
    }).catch(() => {});
    setEmail(value);
    setGateOpen(false);
  }

  if (destinations.length === 0 && status === "loading") return <LoadingScreen />;

  if (destinations.length === 0 && status === "error") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
        <h1 className="font-display text-4xl font-semibold text-stone-800">
          Hmm, that didn&apos;t work.
        </h1>
        <p className="mt-3 text-stone-500">{error}</p>
        <Link
          href="/quiz"
          className="mt-6 rounded-full bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800"
        >
          Back to quiz
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-[#F8FAFC] px-6 py-14">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
        Curated for you
      </p>
      <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-stone-800">
        Your 3 escapes
      </h1>
      <p className="mt-3 max-w-md text-stone-500">
        Every escape below is fully costed — flights, stay, food, car and activities.
        One honest all-in total. No surprises.
      </p>

      <div className="mt-10 grid w-full max-w-xl gap-10">
        {destinations.map((d, i) => (
          <DestinationCard
            key={i}
            d={d}
            index={i + 1}
            answers={answers}
            unlocked={unlocked}
            onUnlock={() => setGateOpen(true)}
          />
        ))}
      </div>

      {status === "loading" && (
        <div className="mt-8 flex items-center gap-3 text-stone-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-teal-600" />
          <span className="text-sm">Finding more…</span>
        </div>
      )}

      {status === "done" && (
        <Link
          href="/quiz"
          className="mt-12 rounded-full border border-stone-300 px-7 py-3 font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
        >
          Plan another trip
        </Link>
      )}

      {gateOpen && (
        <EmailGate onUnlock={handleUnlock} onClose={() => setGateOpen(false)} />
      )}
    </main>
  );
}

function LoadingScreen() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setI((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1)),
      2000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-800 to-teal-600 px-6 text-center">
      {/* Drifting travel bits */}
      <span className="wandr-float absolute left-[12%] top-[22%] text-3xl opacity-70" style={{ animationDelay: "0s" }}>🌴</span>
      <span className="wandr-float absolute right-[14%] top-[28%] text-3xl opacity-70" style={{ animationDelay: "0.6s" }}>☀️</span>
      <span className="wandr-float absolute bottom-[22%] left-[18%] text-3xl opacity-70" style={{ animationDelay: "1.1s" }}>🧭</span>
      <span className="wandr-float absolute bottom-[26%] right-[16%] text-3xl opacity-70" style={{ animationDelay: "1.6s" }}>🏖️</span>

      <h1 className="font-display text-6xl font-semibold tracking-tight text-white">
        wandr<span className="text-yellow-300">.</span>
      </h1>

      {/* Plane flying along a dashed arc */}
      <div className="wandr-scene mt-6">
        <svg viewBox="0 0 300 130" className="h-full w-full" fill="none" aria-hidden="true">
          <path
            d="M18,108 Q150,4 288,64"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="2"
            strokeDasharray="3 7"
            strokeLinecap="round"
          />
        </svg>
        <div className="wandr-plane">✈️</div>
      </div>

      <p className="mt-2 font-display text-xl text-white/90">{LOADING_MESSAGES[i]}</p>
    </main>
  );
}

function DestinationCard({ d, index, answers, unlocked, onUnlock }) {
  const [photo, setPhoto] = useState(null);
  const [imgError, setImgError] = useState(false);

  // Stage-2 details — the paid cost. Only fetched once the user has unlocked.
  const [details, setDetails] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle"); // idle | loading | done | error
  const [retry, setRetry] = useState(0);

  const departureCity = answers?.from || "";

  // Each card fetches its own real photo (keeps the Unsplash key server-side).
  useEffect(() => {
    let live = true;
    fetch("/api/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name, country: d.country }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (live) setPhoto(j.url);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [d.name, d.country]);

  // Load the heavy breakdown ONLY after unlock — so we never spend credits on
  // visitors who don't convert.
  useEffect(() => {
    if (!unlocked) return;
    // Mock mode: no API call, no credits.
    if (MOCK) {
      setDetails(SAMPLE_DETAILS);
      setDetailStatus("done");
      return;
    }
    if (!answers) return;
    let live = true;
    setDetailStatus("loading");
    fetch("/api/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, destination: { name: d.name, country: d.country } }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || "Failed");
        if (live) {
          setDetails(j);
          setDetailStatus("done");
        }
      })
      .catch(() => {
        if (live) setDetailStatus("error");
      });
    return () => {
      live = false;
    };
  }, [unlocked, answers, d.name, d.country, retry]);

  // Pre-fill the booking links from the quiz so the user never re-enters
  // their destination, dates, or party size.
  const dates = answers?.dates || {};
  const partyMap = { Solo: 1, Partner: 2, Family: 4, Friends: 4 };
  const adults = partyMap[answers?.who] || 2;
  const yymmdd = (s) => (s ? s.replaceAll("-", "").slice(2) : "");

  // Flights only when the destination has a real airport (skip drive-only picks).
  // IATA codes make the Skyscanner deep-link actually resolve.
  const canFly = d.originAirport && d.airport && d.originAirport !== d.airport;
  const flightsUrl = !canFly
    ? null
    : dates.start && dates.end
      ? `https://www.skyscanner.net/transport/flights/${d.originAirport}/${d.airport}/${yymmdd(
          dates.start,
        )}/${yymmdd(dates.end)}/?adults=${adults}`
      : `https://www.skyscanner.net/transport/flights/${d.originAirport}/${d.airport}/`;

  const stayParams = new URLSearchParams({
    ss: `${d.name}, ${d.country}`,
    group_adults: String(adults),
    no_rooms: "1",
    group_children: "0",
    selected_currency: "EUR",
  });
  if (dates.start && dates.end) {
    stayParams.set("checkin", dates.start);
    stayParams.set("checkout", dates.end);
  }
  const hotelsUrl = `https://www.booking.com/searchresults.html?${stayParams.toString()}`;

  const activitiesUrl = `https://www.getyourguide.com/s/?q=${encodeURIComponent(
    `${d.name}, ${d.country}`,
  )}`;

  const c = details?.costs || {};

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_6px_40px_rgba(40,30,15,0.10)]">
      <div className="relative h-64 bg-gradient-to-br from-teal-800 to-teal-600">
        {photo && !imgError ? (
          <img
            src={photo}
            alt={`${d.name}, ${d.country}`}
            onError={() => setImgError(true)}
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center">
            <span className="font-display text-8xl font-semibold text-white/90">
              {d.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

        <span className="absolute left-5 top-4 font-display text-2xl font-semibold text-white/90">
          {String(index).padStart(2, "0")}
        </span>

        {typeof d.fit === "number" && (
          <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-teal-800 shadow">
            {d.fit}% match
          </span>
        )}

        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/80">
            {d.country}
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight text-white">
            {d.name}
          </h2>
        </div>
      </div>

      <div className="p-7">
        <p className="font-display text-xl leading-relaxed text-stone-700">{d.description}</p>
        {d.hook && <p className="mt-2 text-sm leading-relaxed text-stone-500">✦ {d.hook}</p>}

        <div className="mt-6">
          {d.allIn && (
            <div className="rounded-xl bg-teal-50 px-4 py-3">
              <p className="font-display text-xl font-semibold text-teal-900">{d.allIn}</p>
              <p className="mt-1 text-xs font-medium text-teal-700">
                ✈️ Flights · 🏨 Stay · 🍽️ Food · 🚗 Car · 🎟️ Activities — sorted
              </p>
            </div>
          )}
          <p className="mt-2 text-sm text-stone-500">{d.priceFrom}</p>
        </div>

        {/* LOCKED: a blurred teaser of the real cost breakdown — the curiosity hook. */}
        {!unlocked && (
          <div className="mt-6 border-t border-stone-200 pt-6">
            <div className="relative">
              <div className="pointer-events-none select-none space-y-2 blur-[5px]" aria-hidden="true">
                <TeaseLine icon="✈️" label="Flights" />
                <TeaseLine icon="🏨" label="Hotel" />
                <TeaseLine icon="🍜" label="Food" />
                <TeaseLine icon="🚗" label="Car rental" />
                <div className="mt-3 h-8 rounded-lg bg-teal-100" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <p className="max-w-[16rem] text-sm font-medium text-stone-600">
                  Exact costs, where to eat & where to book — ready.
                </p>
                <button
                  onClick={onUnlock}
                  className="rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-teal-800"
                >
                  🔓 Unlock the full plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UNLOCKED: the real, fully-costed breakdown. */}
        {unlocked && (
          <div className="mt-7 border-t border-stone-200 pt-6">
            {detailStatus !== "done" && detailStatus !== "error" && (
              <div className="flex items-center gap-3 py-4 text-stone-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-teal-600" />
                <span className="text-sm">Laying it out on a tray…</span>
              </div>
            )}

            {detailStatus === "error" && (
              <button
                onClick={() => setRetry((n) => n + 1)}
                className="text-sm text-teal-700 underline"
              >
                Couldn&apos;t load details — tap to retry.
              </button>
            )}

            {detailStatus === "done" && details && (
              <div className="space-y-5">
                <Info label="Why it fits you" value={details.whyItFits} />
                <Info label="Best time to go" value={details.bestTime} />

                <div>
                  <Label>What it costs</Label>
                  <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
                    <CostLine label="Flights" value={c.flights} />
                    <CostLine label="Stay" value={c.hotel} />
                    <CostLine label="Food" value={c.food} />
                    <CostLine label="Car" value={c.carRental} />
                    <CostLine label="Extras" value={c.extras} />
                  </ul>
                  {c.total && (
                    <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">
                      {c.total}
                    </p>
                  )}
                </div>

                {details.affordability && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    💡 {details.affordability}
                  </p>
                )}

                <div>
                  <Label>Getting there{departureCity ? ` from ${departureCity}` : ""}</Label>
                  <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
                    {(details.gettingThere || []).map((g, k) => (
                      <li key={k}>
                        <span className="font-semibold text-stone-900">{g.mode}:</span> {g.detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <Info label="Beaches & scenery" value={details.beaches} />
                <Info label="Where to eat" value={details.goodEats} />

                <div>
                  <Label>Don&apos;t miss</Label>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {(details.topActivities || []).map((a, j) => (
                      <li
                        key={j}
                        className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-1">
                  <Label>Ready to book?</Label>
                  {flightsUrl ? (
                    <a
                      href={flightsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-full bg-teal-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                      ✈️ Search flights
                    </a>
                  ) : (
                    <p className="rounded-full bg-stone-100 px-5 py-3 text-center text-sm font-medium text-stone-600">
                      🚗 No flight needed — it&apos;s a drive (see “Getting there”)
                    </p>
                  )}
                  <a
                    href={hotelsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-full border border-teal-700 px-5 py-3 text-center text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                  >
                    🏨 Browse hotels
                  </a>
                  <a
                    href={activitiesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-full border border-teal-700 px-5 py-3 text-center text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                  >
                    🎯 Book activities
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function TeaseLine({ icon, label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-stone-700">
      <span>{icon}</span>
      <span className="font-semibold">{label}:</span>
      <span className="text-stone-400">€ 240 – 380 per person, return</span>
    </div>
  );
}

function EmailGate({ onUnlock, onClose }) {
  const [value, setValue] = useState("");
  const valid = /\S+@\S+\.\S+/.test(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <h3 className="font-display text-2xl font-semibold text-stone-800">
          Unlock your 3 full plans
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Exact costs, where to eat, how to get there, and one-tap booking — for all three.
          Pop in your email and it&apos;s yours.
        </p>

        <input
          type="email"
          inputMode="email"
          autoFocus
          placeholder="you@email.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) onUnlock(value.trim());
          }}
          className="mt-5 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg text-slate-800 focus:border-teal-600 focus:outline-none"
        />

        <button
          onClick={() => valid && onUnlock(value.trim())}
          disabled={!valid}
          className="mt-4 w-full rounded-full bg-teal-700 px-6 py-3.5 font-semibold text-white shadow-lg transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          🔓 Unlock my 3 plans
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-stone-400 transition hover:text-stone-600"
        >
          Maybe later
        </button>

        <p className="mt-4 text-center text-xs text-stone-400">
          No spam. Just your trips. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">{children}</p>
  );
}

function CostLine({ label, value }) {
  if (!value) return null;
  return (
    <li>
      <span className="font-semibold text-stone-900">{label}:</span> {value}
    </li>
  );
}

function Info({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-sm leading-relaxed text-stone-700">{value}</p>
    </div>
  );
}
