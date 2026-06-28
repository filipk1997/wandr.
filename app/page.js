import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-teal-800 to-teal-600 px-6 text-center">
      <h1 className="font-display text-7xl font-semibold tracking-tight text-white sm:text-8xl">
        wandr<span className="text-yellow-300">.</span>
      </h1>

      <p className="mt-6 font-display text-2xl italic text-white/90">
        Your trip, planned in minutes.
      </p>

      <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
        Answer a few questions and get three destinations picked for you —
        flights, stays, food and costs, all on one tray.
      </p>

      <Link
        href="/quiz"
        className="mt-10 rounded-full bg-yellow-300 px-8 py-3.5 text-base font-semibold text-teal-900 shadow-lg transition hover:bg-yellow-200"
      >
        Start planning →
      </Link>
    </main>
  );
}
