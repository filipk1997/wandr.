"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Quiz flow. Types:
//   single = pick one      multi = pick many (square checkboxes)
//   dates  = start + end    text  = free text
const QUESTIONS = [
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
    ],
  },
  {
    id: "stay",
    headline: "Where do you want to stay?",
    sub: "Pick as many as you like.",
    type: "multi",
    options: [
      { value: "hotel", label: "🏨 Hotel" },
      { value: "resort", label: "🌴 All-inclusive resort" },
      { value: "villa", label: "🏡 Private villa (whole place)" },
      { value: "apartment", label: "🏖️ Apartment / Airbnb" },
      { value: "boutique", label: "✨ Boutique / unique stay" },
    ],
  },
  {
    id: "flight",
    headline: "How far are you willing to fly?",
    sub: "",
    type: "single",
    options: [
      { value: "short", label: "✈️ Short hop", hint: "Under 3 hours" },
      { value: "medium", label: "🌍 Medium", hint: "3–6 hours" },
      { value: "anywhere", label: "🚀 Anywhere", hint: "The world's open" },
    ],
  },
  {
    id: "extras",
    headline: "Anything on your mind?",
    sub: "Optional — dream spots, places to skip, must-haves, dealbreakers.",
    type: "text",
    multiline: true,
    optional: true,
    placeholder: "e.g. been to Spain already, would love Japan, must have great vegan food",
  },
  {
    id: "from",
    headline: "Last one — where do you take off from?",
    sub: "Your home city or airport.",
    type: "text",
    placeholder: "e.g. Skopje",
  },
];

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
  const answered = q.optional
    ? true
    : q.type === "dates"
      ? current?.start && current?.end
      : q.type === "multi"
        ? Array.isArray(current) && current.length > 0
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
    <main className="flex flex-1 flex-col bg-[#F6F2EA] px-6 py-8">
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
          {/* Single choice */}
          {q.type === "single" && (
            <div className="grid gap-3">
              {q.options.map((opt) => {
                const selected = current === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAnswer(opt.value)}
                    className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition ${
                      selected
                        ? "border-teal-600 bg-teal-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span>
                      <span className="block text-lg font-semibold text-slate-800">
                        {opt.label}
                      </span>
                      {opt.hint && (
                        <span className="text-sm text-slate-500">{opt.hint}</span>
                      )}
                    </span>
                    {selected && <span className="text-xl text-teal-600">✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi-select (square checkboxes) */}
          {q.type === "multi" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {q.options.map((opt) => {
                const selected = Array.isArray(current) && current.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleMulti(opt.value)}
                    className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition ${
                      selected
                        ? "border-teal-600 bg-teal-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 text-sm font-bold text-white transition ${
                        selected
                          ? "border-teal-600 bg-teal-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span className="text-lg font-medium text-slate-800">
                      {opt.label}
                    </span>
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

          {/* Text — single line */}
          {q.type === "text" && !q.multiline && (
            <input
              type="text"
              placeholder={q.placeholder}
              value={current || ""}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-lg text-slate-800 focus:border-teal-600 focus:outline-none"
            />
          )}

          {/* Text — multi line (free notes) */}
          {q.type === "text" && q.multiline && (
            <textarea
              rows={4}
              placeholder={q.placeholder}
              value={current || ""}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full resize-none rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-lg text-slate-800 focus:border-teal-600 focus:outline-none"
            />
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
