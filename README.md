# Alex & Victory — Monster Island: Tidal Echoes

**Family beta 2.1 — 简中 / 繁中 / English.**

Hub: https://sydneygemstone-sudo.github.io/alex-victory-monster-island/
Game: https://sydneygemstone-sudo.github.io/alex-victory-monster-island/game/

Current release notes and scoring/accounting retrospective: **docs/RELEASE-2.1.md**.
Current token ledger: **data/costs-2.1.json**. Current acceptance: **data/acceptance-2.1.json**.
Previous 2.0 documents and reports describe the historical version only.

## Play

Open the game link for solo play. The new skippable 36-second prologue runs before controls become available. Alex fires visible rail slugs; Victory lifts and throws environmental rocks. First victory unlocks an aimed leap slam. Pause settings contain audio, reduced-motion and numeric-feedback controls.

Physical iPad / Safari acceptance remains pending. Automated desktop-browser tests are not physical-device certification.

## Two iPads on the same Wi-Fi

With Node.js installed, run `node server.mjs` from this directory (or use start.command / start.cmd). Open the printed LAN address on both iPads. One creates the room, the other joins with its code; the host starts. The prologue is synchronized, and boss HP is exactly twice the corresponding solo round. Disconnecting or backgrounding a player pauses the room. GitHub Pages does not host a public co-op backend.

## Preserved classroom artifacts

`originals/` and `archive/` are unchanged classroom snapshots. `playable/gpt-6-astra/` is a compatibility mirror changing only three root-relative HTML resource URLs. Its game.js and combat.js remain byte-identical to the original. The model comparison links to this working subdirectory-safe mirror.

## Verification

`npm test` runs the 29 rule and HTTP/SSE tests without an npm install. The Python browser checks require Playwright and a local Chrome executable; they use explicitly labelled scenario setup, accelerated time and browser inputs. Results and limitations are published in data/acceptance-2.1.json.

## Accounting

The three metered classroom CLI sessions total **A$18.3606266844** at published standard API-equivalent rates, representing **18.3606266844%** of the A$100 budget. This is not an extra subscription invoice. Cached inputs and cache creation are separated, streaming duplicates removed, and reasoning is not counted twice.

ChatGPT web original, 2.0 and 2.1 have no exposed token receipts and are **unmetered, not zero-cost**. The full-project total and remaining budget cannot be certified. Human rebuild labour is an explicit 92-hour estimate, not actual expenditure or a contractor quote.

## Privacy and assets

No raw classroom audio, private transcript, account key or contact details is published. Family feedback stays in the local browser until manually copied/downloaded. The guardian WAV is an original synthesized placeholder that can be replaced in a future classroom audio lesson. Three.js is included with its license. This remains a classroom beta, not a commercial-readiness guarantee.
