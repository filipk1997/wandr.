"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LOADING_MESSAGES = [
  "Scanning the whole world...",
  "Matching your taste, not the tourist crowds...",
  "Comparing flights, stays and prices...",
  "Laying your trip out on a tray...",
  "Almost ready...",
];

const slug = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export default function Results() {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [destinations, setDestinations] = useState([]);
  const [departureCity, setDepartureCity] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("wandr_answers");
    if (!saved) {
      setStatus("error");
      setError("No quiz answers found. Take the quiz first.");
      return;
    }

    try {
      setDepartureCity(JSON.parse(saved).from || "");
    } catch {}

    async function getDestinations() {
      try {
        const res = await fetch("/api/destinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: saved,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");
        setDestinations(data.destinations);
        setStatus("done");
      } catch (err) {
        setError(err.message);
        setStatus("error");
      }
    }

    getDestinations();
  }, []);

  if (status === "loading") return <LoadingScreen />;

  return (
    <main className="flex flex-1 flex-col items-center bg-[#F6F2EA] px-6 py-14">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
        Curated for you
      </p>
      <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-stone-800">
        Your 3 escapes
      </h1>

      {status === "error" && (
        <div className="mt-12 max-w-md text-center">
          <p className="text-lg font-medium text-stone-700">Hmm, that didn&apos;t work.</p>
          <p className="mt-2 text-sm text-stone-500">{error}</p>
          <Link
            href="/quiz"
            className="mt-6 inline-block rounded-full bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800"
          >
            Back to quiz
          </Link>
        </div>
      )}

      {status === "done" && (
        <>
          <p className="mt-3 text-stone-500">Three places, fully costed. Tap one to dig in.</p>

          <div className="mt-10 grid w-full max-w-xl gap-10">
            {destinations.map((d, i) => (
              <DestinationCard key={i} d={d} index={i + 1} departureCity={departureCity} />
            ))}
          </div>

          <Link
            href="/quiz"
            className="mt-12 rounded-full border border-stone-300 px-7 py-3 font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
          >
            Plan another trip
          </Link>
        </>
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
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-teal-800 to-teal-600 px-6 text-center">
      <h1 className="font-display text-6xl font-semibold tracking-tight text-white">
        wandr<span className="text-yellow-300">.</span>
      </h1>
      <div className="mt-8 h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <p className="mt-6 font-display text-xl text-white/90">{LOADING_MESSAGES[i]}</p>
    </main>
  );
}

function DestinationCard({ d, index, departureCity }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = d.imageUrl;

  const flightsUrl = `https://www.skyscanner.com/transport/flights/${slug(
    departureCity,
  )}/${slug(d.name)}/`;
  const hotelsUrl = `https://www.booking.com/search.html?ss=${encodeURIComponent(d.name)}`;
  const activitiesUrl = `https://www.getyourguide.com/s/?q=${encodeURIComponent(d.name)}`;

  const c = d.costs || {};

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_6px_40px_rgba(40,30,15,0.10)]">
      {/* Full-bleed magazine image */}
      <div className="relative h-64 bg-gradient-to-br from-teal-800 to-teal-600">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
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

        {/* Magazine index */}
        <span className="absolute left-5 top-4 font-display text-2xl font-semibold text-white/90">
          {String(index).padStart(2, "0")}
        </span>

        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/80">
            {d.country}
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight text-white">
            {d.name}
          </h2>
        </div>
      </div>

      {/* Body */}
      <div className="p-7">
        <p className="font-display text-xl leading-relaxed text-stone-700">
          {d.description}
        </p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="font-display text-lg font-semibold text-teal-800">
            {d.priceFrom || c.total}
          </span>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex-none rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            {open ? "Hide details" : "See details"}
          </button>
        </div>

        {open && (
          <div className="mt-7 space-y-5 border-t border-stone-200 pt-6">
            <Info label="Why it fits you" value={d.whyItFits} />
            <Info label="Best time to go" value={d.bestTime} />

            <div>
              <Label>What it costs</Label>
              <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
                <CostLine label="Flights" value={c.flights} />
                <CostLine label="Hotel" value={c.hotel} />
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

            {d.affordability && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                💡 {d.affordability}
              </p>
            )}

            <div>
              <Label>Getting there{departureCity ? ` from ${departureCity}` : ""}</Label>
              <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
                {(d.gettingThere || []).map((g, k) => (
                  <li key={k}>
                    <span className="font-semibold text-stone-900">{g.mode}:</span> {g.detail}
                  </li>
                ))}
              </ul>
            </div>

            <Info label="Beaches & scenery" value={d.beaches} />
            <Info label="Where to eat" value={d.goodEats} />

            <div>
              <Label>Don&apos;t miss</Label>
              <ul className="mt-2 flex flex-wrap gap-2">
                {(d.topActivities || []).map((a, j) => (
                  <li
                    key={j}
                    className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Booking */}
            <div className="space-y-2 pt-1">
              <Label>Ready to book?</Label>
              <a
                href={flightsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-full bg-teal-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                ✈️ Search flights
              </a>
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
    </article>
  );
}

function Label({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
      {children}
    </p>
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
