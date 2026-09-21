# Acceptance — 2.0 family beta

## Run during this iteration
- Original entry B: 8 existing Node pure-rule checks passed on Mac.
- Original Codex entry: 6 existing Node pure-rule checks passed on Mac.
- New shared engine: 19 Node checks passed, including both heroes completing fights using movement/skills, not direct boss-health overrides in those two full-flow tests.
- New two-client LAN protocol: 1 integration check passed, covering room creation, join cap, distinct heroes, 2x HP, state delivery, movement, input validation, duplicate sequence rejection, disconnect freeze and reconnect, origin and private-path checks.
- JavaScript syntax checked for all newly authored modules.

## Not claimed
Four-original browser replay scripts were blocked by the available tool. Prior original QA reports do not substitute for a new test run. No current physical iPad/Safari touch, rendering, audio or performance pass is claimed. No two-physical-device Wi-Fi playtest was performed. Numerical/source inspection does not prove freedom from UI bugs. The page and new game must remain labelled BETA / awaiting device review.

Evidence: qa/node-tests.tap; individual tests in qa/core.test.mjs and qa/network.test.mjs. Additional delivery checks are recorded in qa/delivery-checks.json when performed.
