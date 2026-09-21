# Monster Island 2.0 — release specification

## Release status
Family beta. Direct implementation in this ChatGPT conversation; no development worker launched. Rules/server tests are separate from browser and physical-device acceptance.

## Choice of foundation
Reuse the Web 6Pro scene's procedural visual vocabulary and models. Replace its monolithic mutable rules with `game/core.mjs`, shared unchanged by solo and the authoritative LAN server. Codex's separate combat module demonstrated a useful architectural boundary; its original source is preserved, not silently merged. The environmental stone idea is implemented with identified persistent rocks, not merely a differently colored projectile.

## Mechanics
One island shore encounter. Alex: hold Arc, Overcharge. Victory: find one of 13 rocks, lift, throw; Gravity interrupts windup. Four telegraphed boss attacks: targeted circle, five-projectile fan per live target, charge, radial roar. Stun/dash/Anchor have explicit timers. No regeneration or free disengagement while the arena is committed. First victory yields 12 crystals, unlocks Anchor, then a machine offers three capped upgrades. Rematches increase boss health by 1.28 per round (up to challenge 6). Castle treasure is not awarded.

Solo starts at 960 boss HP; co-op starts at 1920. Each live player is targeted by ground and ranged attacks. Exact 2x HP is tested; perceived difficulty cannot be guaranteed to be exactly twice. Co-op player roles are distinct. A downed player waits; both down ends the run.

## Input and graphics
Third-person fixed-FOV follow camera. No OrbitControls, wheel zoom, or pointer-look binding. Game-only touch-action and gesture suppression; public hub keeps ordinary browser accessibility and zoom. Pointer release, cancel and lost capture clear input. Blur/visibility pauses gameplay.

Original grass and sand caps were both y=-0.01: a source-level z-fighting risk. New grass cap is y=0.035 and trail height 0.10; translucent ground indicators are raised to 0.22–0.30. This removes the inspected coplanar overlap, not a promise to fix every possible device glitch. Static terrain is instanced by geometry/material. Runtime meshes are reused for rocks and hostile shots.

## Audio and scene
Synthesized Web Audio soundtrack and sound design, no sampled music or downloaded game assets. Sound starts after a click. Master gain and compressor limit output, music/effects toggles available. Intro is short and skippable, non-graphic. All environment props are procedural. Three.js is vendored with its MIT license.

## Languages and storage
One codebase and explicit phrase dictionaries for zh-Hans, zh-Hant and en. Language persists locally; direct links carry ?lang=. Solo progression persists only on that device and is validated/clamped when loaded. Co-op progression belongs to that room and is not silently imported into solo. Reset requires confirmation.

## Local co-op
`node server.mjs` or the launchers, Node 20+. Default port 8896; configurable PORT. HTTP input plus SSE snapshots, 60Hz rule updates and about 20Hz snapshots. Two-player cap, random room/token, input sequence deduplication, finite/clamped input, host-only launch/rematch/finish, bounded messages/rate, restricted static paths. Disconnect pauses the whole room and clears input. Reconnect reuses the in-tab token and requires explicit resume. No cloud relay or public tunnel is opened. Browser HTTPS pages cannot be presented as a remotely hosted co-op server.

## Release gates
Automated: rules, rewards, upgrades, authoritative network, translation coverage, source links and archive hashes. Outstanding: all four originals re-played in a browser, family-edition browser UI and WebGL review, actual iPad Safari multitouch / orientation / audio, two real iPads on Wi-Fi, student difficulty review. Publish with BETA label while these remain open.
