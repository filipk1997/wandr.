"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LOADING_MESSAGES = [
  "Scanning 10,000+ destinations...",
  "Skipping the obvious tourist traps...",
  "Comparing flights, cars and hotels...",
  "Adding up what it really costs...",
  "Almost ready...",
];

// Turn a city name into a URL-safe slug for the Skyscanner path.
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
    <main className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight text-slate-800">
        Your 3 escapes
      </h1>

      {status === "error" && (
        <div className="mt-12 max-w-md text-center">
          <p className="text-lg font-medium text-slate-700">Hmm, that didn&apos;t work.</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Link
            href="/quiz"
            className="mt-6 inline-block rounded-full bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700"
          >
            Back to quiz
          </Link>
        </div>
      )}

      {status === "done" && (
        <>
          <p className="mt-2 text-slate-500">Hidden gems — tap a card for the full breakdown.</p>

          <div className="mt-8 grid w-full max-w-xl gap-6">
            {destinations.map((d, i) => (
              <DestinationCard key={i} d={d} departureCity={departureCity} />
            ))}
          </div>

          <Link
            href="/quiz"
            className="mt-10 rounded-full border-2 border-teal-600 px-6 py-3 font-semibold text-teal-700 transition hover:bg-teal-50"
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
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-teal-700 to-teal-500 px-6 text-center">
      <h1 className="font-display text-6xl font-bold tracking-tight text-white">
        wandr<span className="text-yellow-300">.</span>
      </h1>
      <div className="mt-8 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      <p className="mt-6 text-lg font-medium text-white/90">{LOADING_MESSAGES[i]}</p>
    </main>
  );
}

function DestinationCard({ d, departureCity }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Relevant destination photo by keyword. Single-word tags match reliably.
  const photoQuery = d.name.split(/[(&,]/)[0].trim().split(/\s+/)[0] || d.name;
  const imageUrl = `https://loremflickr.com/800/400/${encodeURIComponent(photoQuery)}`;

  // Affiliate deep-links built from the real city values.
  const flightsUrl = `https://www.skyscanner.com/transport/flights/${slug(
    departureCity,
  )}/${slug(d.name)}/`;
  const hotelsUrl = `https://www.booking.com/search.html?ss=${encodeURIComponent(d.name)}`;
  const activitiesUrl = `https://www.getyourguide.com/s/?q=${encodeURIComponent(d.name)}`;

  const c = d.costs || {};

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Image banner */}
      <div className="relative h-44 bg-gradient-to-br from-teal-700 to-teal-500">
        {!imgError ? (
          <img
            src={imageUrl}
            alt={`${d.name}, ${d.country}`}
            onError={() => setImgError(true)}
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="flex h-44 w-full items-center justify-center">
            <span className="font-display text-7xl font-bold text-white">
              {d.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-xs font-medium text-white/80">{d.country}</p>
          <h2 className="font-display text-2xl font-bold text-white drop-shadow-sm">
            {d.name}
          </h2>
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-yellow-300 px-2.5 py-1 text-xs font-bold text-teal-900">
          💎 Hidden gem
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="text-slate-600">{d.description}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
            {c.total}
          </span>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex-none rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {open ? "Hide details" : "See details"}
          </button>
        </div>

        {/* Expandable details */}
        {open && (
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
            <Info label="Why it's a hidden gem" value={d.whyHidden} />
            <Info label="Why it fits you" value={d.whyItFits} />
            <Info label="Best time to go" value={d.bestTime} />

            {/* Cost breakdown — everything on a tray */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                💰 What it costs
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                <CostLine label="Flights" value={c.flights} />
                <CostLine label="Hotel" value={c.hotel} />
                <CostLine label="Food" value={c.food} />
                <CostLine label="Car" value={c.carRental} />
                <CostLine label="Extras" value={c.extras} />
              </ul>
              <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
                Total: {c.total}
              </p>
            </div>

            {d.affordability && (
              <p className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
                💡 {d.affordability}
              </p>
            )}

            {/* Getting there */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Getting there{departureCity ? ` from ${departureCity}` : ""}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {(d.gettingThere || []).map((g, k) => (
                  <li key={k}>
                    <span className="font-semibold text-slate-800">{g.mode}:</span>{" "}
                    {g.detail}
                  </li>
                ))}
              </ul>
            </div>

            <Info label="🏖️ Beaches & nature" value={d.beaches} />
            <Info label="🍽️ Good eats" value={d.goodEats} />

            {/* Top activities */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Top activities
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {(d.topActivities || []).map((a, j) => (
                  <li
                    key={j}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Affiliate booking buttons */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-slate-400">Ready to book?</p>
              <a
                href={flightsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-full bg-teal-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                ✈️ Search flights
              </a>
              <a
                href={hotelsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-full border-2 border-teal-600 bg-white px-5 py-3 text-center text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
              >
                🏨 Browse hotels
              </a>
              <a
                href={activitiesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-full border-2 border-teal-600 bg-white px-5 py-3 text-center text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
              >
                🎯 Book activities
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CostLine({ label, value }) {
  if (!value) return null;
  return (
    <li>
      <span className="font-semibold text-slate-800">{label}:</span> {value}
    </li>
  );
}

function Info({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-700">{value}</p>
    </div>
  );
}
