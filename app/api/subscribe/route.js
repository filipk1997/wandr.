// Captures an email when a visitor unlocks their plans.
// If SHEET_WEBHOOK_URL is set (a Google Sheet Apps Script web app), the email
// is appended there. Otherwise it's just logged — the app never breaks either way.
export const maxDuration = 10;

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    const url = process.env.SHEET_WEBHOOK_URL;
    if (url) {
      // Fire to the Google Sheet webhook. Don't let a slow/failed sheet block
      // the visitor — we already returned ok to them.
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ts: new Date().toISOString() }),
      }).catch(() => {});
    } else {
      console.log("New wandr signup (set SHEET_WEBHOOK_URL to save these):", email);
    }

    return Response.json({ ok: true });
  } catch {
    // Never block the unlock on a capture failure.
    return Response.json({ ok: true });
  }
}
