"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Quiz flow. Types:
//   single = pick one   multi = pick many   dates = start+end
//   slider = taste scale   origin = city autocomplete (structured IATA)
const QUESTIONS = [
  {
    id: "region",
    headline: "Where's calling you?",
    sub: "Pick as many as you like — or let us surprise you.",
    type: "multi",
    options: [
      { value: "balkans", label: "🏖️ The Balkans", hint: "Macedonia, Croatia, Albania, Bulgaria…" },
      { value: "med", label: "🍋 Mediterranean", hint: "Spain, Italy, Greece, Portugal, France" },
      { value: "heart_eu", label: "🏰 Heart of Europe", hint: "Germany, Austria, UK, Czechia, Poland…" },
      { value: "nordic", label: "❄️ Nordic & wild", hint: "Scandinavia, Iceland, Baltics" },
      { value: "sun_ancient", label: "🐪 Sun & ancient", hint: "Turkey, Morocco, Egypt, Jordan, UAE" },
      { value: "silk_road", label: "🗺️ Caucasus & Silk Road", hint: "Georgia, Armenia, Central Asia" },
      { value: "far_east", label: "🏮 Far East", hint: "Japan, South Korea, Taiwan" },
      { value: "trop_asia", label: "🌴 Tropical Asia", hint: "Thailand, Bali, Vietnam, Maldives" },
      { value: "africa", label: "🦁 Africa & safari", hint: "South Africa, Tanzania, Kenya, Namibia" },
      { value: "na", label: "🗽 USA & Canada", hint: "United States, Canada" },
      { value: "latin", label: "🌮 Latin & Caribbean", hint: "Mexico, Caribbean, South America" },
      { value: "oceania", label: "🐠 Oceania & Pacific", hint: "Australia, New Zealand, Fiji" },
      { value: "surprise", label: "🎲 Surprise me", hint: "I'm open — anywhere" },
    ],
  },
  {
    id: "vibe",
    headline: "What are you dreaming of?",
    sub: "Pick as many as you like.",
    type: "multi",
    options: [
      { value: "beach", label: "🏖️ Beach & sea" },
      { value: "city", label: "🌆 City & nightlife" },
      { value: "culture", label: "🏛️ Culture & history" },
      { value: "food_wine", label: "🍷 Food & wine" },
      { value: "nature", label: "🌿 Nature & outdoors" },
      { value: "relax", label: "🧘 Relax & wellness" },
      { value: "adventure", label: "🧗 Adventure" },
      { value: "romance", label: "💞 Romance" },
      { value: "diving", label: "🤿 Diving & snorkeling" },
      { value: "ski", label: "⛷️ Ski & snow" },
      { value: "wildlife", label: "🦁 Wildlife & safari" },
    ],
  },
  {
    id: "discovery",
    headline: "Iconic or hidden gem?",
    sub: "Tap your taste.",
    type: "single",
    options: [
      { value: "famous", label: "🌟 Famous & iconic", hint: "the places everyone loves" },
      { value: "both", label: "⚖️ Best of both", hint: "popular, plus a few secrets" },
      { value: "hidden", label: "💎 Hidden gems", hint: "off the radar, where locals go" },
    ],
  },
  {
    id: "weather",
    headline: "What weather do you want?",
    type: "single",
    options: [
      { value: "hot", label: "☀️ Hot & sunny" },
      { value: "mild", label: "🌤️ Warm & mild" },
      { value: "cool", label: "🍂 Cool & crisp" },
      { value: "snow", label: "❄️ Snow & cozy" },
      { value: "any", label: "🤷 Any — surprise me" },
    ],
  },
  {
    id: "budget",
    headline: "What's your budget?",
    sub: "Per person, flights + stay. A ballpark is fine.",
    type: "single",
    options: [
      { value: "Under €500", label: "Under €500", hint: "Smart & scrappy" },
      { value: "€500 – €1,500", label: "€500 – €1,500", hint: "Comfortable" },
      { value: "€1,500 – €3,000", label: "€1,500 – €3,000", hint: "Treat yourself" },
      { value: "€3,000+", label: "€3,000+", hint: "Sky's the limit" },
    ],
  },
  {
    id: "dates",
    headline: "When are you escaping?",
    sub: "Exact dates or roughly — both work.",
    type: "dates",
  },
  {
    id: "who",
    headline: "Who's coming with you?",
    type: "single",
    options: [
      { value: "Solo", label: "🧍 Solo", hint: "Just me" },
      { value: "Partner", label: "❤️ Partner", hint: "The two of us" },
      { value: "Family", label: "👨‍👩‍👧 Family", hint: "Kids in tow" },
      { value: "Friends", label: "🎉 Friends", hint: "The whole crew" },
    ],
  },
  {
    id: "stay",
    headline: "Where do you want to stay?",
    sub: "Pick as many as you like.",
    type: "multi",
    options: [
      { value: "resort", label: "🌊 Beachfront resort" },
      { value: "boutique", label: "🏛️ Boutique hotel" },
      { value: "villa", label: "🏡 Private villa + pool" },
      { value: "cabin", label: "🏔️ Cozy cabin / chalet" },
      { value: "apartment", label: "🏙️ Trendy apartment" },
      { value: "unique", label: "🌿 Unique stay", hint: "riad, treehouse, overwater" },
      { value: "budget", label: "🎒 Budget / hostel" },
      { value: "farm", label: "🐄 Farm / agrotourism" },
    ],
  },
  {
    id: "from",
    headline: "Last one — where do you take off from?",
    sub: "Start typing your home city and pick it from the list.",
    type: "origin",
    placeholder: "e.g. Skopje",
  },
];

// Split a leading emoji off a label so we can render it big on the tile.
function splitEmoji(label) {
  const parts = String(label).split(" ");
  const hasEmoji = parts[0] && !/[a-z0-9€]/i.test(parts[0]);
  return {
    emoji: hasEmoji ? parts[0] : "",
    text: hasEmoji ? parts.slice(1).join(" ") : label,
  };
}

// Origin city autocomplete → stores a structured {city, iata, lat, lon}.
// Falls back to a plain typed string if TP autocomplete is unavailable.
function OriginPicker({ value, onChange, placeholder }) {
  const [text, setText] = useState(
    value && typeof value === "object" ? `${value.city} (${value.iata})` : value || "",
  );
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleType(v) {
    setText(v);
    onChange(v); // store the raw string as a fallback while typing
    clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setList([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/places-autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: v }),
        });
        const j = await r.json();
        setList(j.places || []);
        setOpen((j.places || []).length > 0);
      } catch {
        setList([]);
      }
    }, 250);
  }

  function pick(p) {
    onChange(p);
    setText(`${p.city} (${p.iata})`);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={text}
        autoComplete="off"
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => list.length && setOpen(true)}
        className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-lg text-slate-800 focus:border-teal-600 focus:outline-none"
      />
      {open && (
        <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {list.map((p) => (
            <li key={p.iata}>
              <button
                onClick={() => pick(p)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-teal-50"
              >
                <span className="text-slate-800">
                  {p.city}
                  <span className="ml-2 text-sm text-slate-400">{p.country}</span>
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                  {p.iata}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Quiz() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const q = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = ((step + 1) / QUESTIONS.length) * 100;
  const current = answers[q.id];

  function setAnswer(value) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function toggleMulti(value) {
    const arr = Array.isArray(current) ? current : [];
    setAnswer(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  }

  // Is the current question answered? (controls the Next button)
  const answered =
    q.optional
      ? true
      : q.type === "dates"
        ? current?.start && current?.end
        : q.type === "multi"
          ? Array.isArray(current) && current.length > 0
          : q.type === "origin"
            ? typeof current === "object"
              ? Boolean(current?.iata)
              : Boolean(current && String(current).trim())
            : Boolean(current && String(current).trim());

  function goNext() {
    if (isLast) {
      localStorage.setItem("wandr_answers", JSON.stringify(answers));
      router.push("/results");
    } else {
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <main className="flex flex-1 flex-col bg-[#F8FAFC] px-6 py-8">
      {/* Progress */}
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-2 flex items-center justify-between text-sm">
          <button
            onClick={goBack}
            disabled={step === 0}
            className="font-medium text-teal-700 transition hover:text-teal-900 disabled:invisible"
          >
            ← Back
          </button>
          <span className="text-slate-400">
            {isLast ? "Last one ✨" : `${Math.round(progress)}% there`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-teal-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
          {q.headline}
        </h1>
        {q.sub && <p className="mt-3 text-lg text-slate-500">{q.sub}</p>}

        <div className="mt-8">
          {/* Single choice — premium tiles */}
          {q.type === "single" && (
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((opt) => {
                const selected = current === opt.value;
                const { emoji, text } = splitEmoji(opt.label);
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAnswer(opt.value)}
                    className={`group relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-all duration-200 [transform-style:preserve-3d] hover:z-10 hover:shadow-xl hover:[transform:perspective(700px)_rotateX(7deg)_translateY(-4px)_scale(1.03)] active:[transform:scale(0.97)] ${
                      selected
                        ? "border-teal-500 bg-teal-50 shadow-md ring-2 ring-teal-500/40"
                        : "border-slate-200 bg-white hover:border-teal-300"
                    }`}
                  >
                    {emoji && (
                      <span
                        className={`text-3xl transition-transform duration-200 group-hover:scale-110 ${
                          selected ? "scale-110" : ""
                        }`}
                      >
                        {emoji}
                      </span>
                    )}
                    <span className="text-base font-semibold leading-tight text-slate-800">{text}</span>
                    {opt.hint && <span className="text-xs leading-snug text-slate-400">{opt.hint}</span>}
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white shadow">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi-select — premium tiles */}
          {q.type === "multi" && (
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((opt) => {
                const selected = Array.isArray(current) && current.includes(opt.value);
                const { emoji, text } = splitEmoji(opt.label);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleMulti(opt.value)}
                    className={`group relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-all duration-200 [transform-style:preserve-3d] hover:z-10 hover:shadow-xl hover:[transform:perspective(700px)_rotateX(7deg)_translateY(-4px)_scale(1.03)] active:[transform:scale(0.97)] ${
                      selected
                        ? "border-teal-500 bg-teal-50 shadow-md ring-2 ring-teal-500/40"
                        : "border-slate-200 bg-white hover:border-teal-300"
                    }`}
                  >
                    {emoji && (
                      <span
                        className={`text-3xl transition-transform duration-200 group-hover:scale-110 ${
                          selected ? "scale-110" : ""
                        }`}
                      >
                        {emoji}
                      </span>
                    )}
                    <span className="text-sm font-semibold leading-tight text-slate-800">{text}</span>
                    {opt.hint && (
                      <span className="text-[11px] leading-snug text-slate-400">{opt.hint}</span>
                    )}
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white shadow">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Dates */}
          {q.type === "dates" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                From
                <input
                  type="date"
                  value={current?.start || ""}
                  onChange={(e) => setAnswer({ ...current, start: e.target.value })}
                  className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg text-slate-800 focus:border-teal-600 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                To
                <input
                  type="date"
                  value={current?.end || ""}
                  onChange={(e) => setAnswer({ ...current, end: e.target.value })}
                  className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg text-slate-800 focus:border-teal-600 focus:outline-none"
                />
              </label>
            </div>
          )}

          {/* Origin — city autocomplete */}
          {q.type === "origin" && (
            <OriginPicker value={current} onChange={setAnswer} placeholder={q.placeholder} />
          )}

        </div>

        {/* Next / Finish */}
        <button
          onClick={goNext}
          disabled={!answered}
          className="mt-10 rounded-full bg-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {isLast ? "Find my 3 escapes ✈️" : "Next →"}
        </button>
      </div>
    </main>
  );
}
