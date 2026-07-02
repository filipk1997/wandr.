// Captures an email when a visitor unlocks their plans.
// If SHEET_WEBHOOK_URL is set (a Google Sheet Apps Script web app), the email
// is appended there. Otherwise it's just logged — the app never breaks either way.
export const maxDuration = 15;

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    const url = process.env.SHEET_WEBHOOK_URL;
    if (url) {
      // Apps Script runs doPost() (the appendRow) BEFORE it 302-redirects to a
      // googleusercontent URL that just echoes the result. That second hop is
      // what hangs on Vercel — so we stop at the redirect (row is already saved)
      // and hard-cap the wait so the function can never time out.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, ts: new Date().toISOString() }),
          redirect: "manual",
          signal: ctrl.signal,
        });
      } catch {
      } finally {
        clearTimeout(timer);
      }
    } else {
      console.log("New wandr signup (set SHEET_WEBHOOK_URL to save these):", email);
    }

    return Response.json({ ok: true });
  } catch {
    // Never block the unlock on a capture failure.
    return Response.json({ ok: true });
  }
}
