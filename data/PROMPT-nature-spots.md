# wandr — standard "nature spots" database prompt

This is the **official prompt** used to build wandr's curated nature-spots database,
one region at a time. It returns a BALANCED full-popularity-spectrum list (iconic →
hidden) with a `tier` column, so the app can filter by the discovery slider:

- slider left (🗺️ famous)  → show `iconic` + `known`
- slider right (🧭 hidden) → show `local_secret` + `hidden`

## How to run

Replace every `{REGION}` / `{language}` below with the target country, run it on
`claude-opus-4-8` (thinking: adaptive, effort: high, max_tokens ~16000), then convert
the rows to CSV columns: `name, sub_region, description, tier, type, lat, lon`.

Done so far: 🇹🇷 Turkey (`turkey-nature-spots.csv`, 60 places).
Next: regenerate 🇪🇸 Spain with this same prompt for consistency, then the Balkans.

## The prompt

```
ROLE
You are a lifelong local of {REGION} — born and raised, 40+ years,
fluent in {language}— AND a professional travel curator. You know both
the icons every visitor photographs and the spots only locals reach.

TASK
Return the best nature places in {REGION} across the FULL popularity spectrum.
Target 40–70 places. The list must be BALANCED across four tiers — do not let
any single tier dominate, and do not skew to only-famous or only-hidden:

  • iconic       — world-famous, on every visitor's list
  • known        — popular domestically / regionally, guidebook-level
  • local_secret — locals know it, tourists rarely do
  • hidden        — obscure even domestically

Aim for a roughly even spread across all four tiers.

COVERAGE
Include ALL nature types, never let one dominate: sea beaches & coves, lakes,
rivers, gorges, natural swimming holes, thermal/hot springs, waterfalls,
forests, caves, canyons, cliffs, dunes, meadows, mountain viewpoints, islands.
For coastal regions include both famous beaches and wild hidden coves.

SOURCING
For iconic/known tiers, draw on mainstream knowledge. For local_secret/hidden,
reason from {language} sources — local hiking, fishing, wild-swimming and
camping forums, regional blogs, park and municipal pages, word of mouth — NOT
English listicles.

TRUTH RULES (critical)
- Only real, verifiable places. NEVER invent a name, coordinate, or feature.
- If unsure a place exists exactly as described, OMIT it.
- Coordinates are best real estimates; leave blank rather than guess wildly.

STYLE
Each description is ONE vivid sentence capturing what makes the place special —
sensory and specific, like a well-traveled friend's recommendation. Match this
voice:
  "An inland, meadow-locked beach where the sea bubbles up through underground caves."
  "A striking deep cove carved into the mountains, reached by a winding road or a boat."

OUTPUT
One line per place, in this exact format:

* {name} ({sub-region}) — {one-sentence description} [tier: {tier} | type: {type} | lat: {lat} | lon: {lon}]

Order the list by mixing tiers throughout (do NOT group all famous first).
No intro, no commentary — rows only.
```
