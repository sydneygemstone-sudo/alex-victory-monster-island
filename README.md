# Alex & Victory — Monster Island: Tidal Echoes

**Family beta 2.0 — 简中 / 繁中 / English.**

Hub: https://sydneygemstone-sudo.github.io/alex-victory-monster-island/
Game: https://sydneygemstone-sudo.github.io/alex-victory-monster-island/game/

Newest build first; four original entry points are preserved under originals/ and archive/.
See docs/SPEC-2.0.md, docs/CLASSROOM_FEEDBACK.md, docs/PROVENANCE.md, docs/ACCEPTANCE.md and docs/BUDGET.md.

## At home
Open the public game link in iPad Safari. Solo requires no local server; all engine files are included in the website. Physical-device acceptance remains pending.

## Two iPads on the same Wi-Fi
Install Node 20+ and run `node server.mjs` in this directory, or use start.command / start.cmd. Open the printed local address on both iPads; choose create room on the first, join using the room code on the second, then launch together. Boss HP is exactly doubled; both players receive attack targets. Closing/backgrounding a player pauses the room. No internet co-op backend is hosted by GitHub Pages.

## Reproduce tests
`npm test` (no npm install required). Tests exercise shared rules and HTTP/SSE clients, not Safari or rendered frame quality.

## Privacy
Only first names and edited game-design requirements are public. No voice recording, raw classroom transcript, secret key or participant contact information is published. Feedback is saved on the player's device and exported manually; it is not automatically sent.

## Accounting
A$100 stage envelope; provider-billed token totals unknown. See data/budget.json. Do not mistake source-size equivalence, planned allocation or subscription use for an invoice.

Three.js is included under its MIT license. Custom code is a classroom project, not a promise of commercial readiness.
