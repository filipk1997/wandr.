import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-teal-700 to-teal-500 px-6 text-center">
      <h1 className="text-7xl font-extrabold tracking-tight text-white sm:text-8xl">
        wandr<span className="text-yellow-300">.</span>
      </h1>

      <p className="mt-6 text-lg font-medium text-white/85">
        Your trip, planned in minutes.
      </p>

      <p className="mt-3 max-w-md text-base text-white/70">
        Answer a few questions and get 3 personalized destinations —
        flights, stays, weather, and costs included.
      </p>

      <Link
        href="/quiz"
        className="mt-10 rounded-full bg-yellow-300 px-8 py-3 text-base font-semibold text-teal-900 shadow-lg transition hover:bg-yellow-200"
      >
        Start planning →
      </Link>
    </main>
  );
}
