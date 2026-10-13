# Fier Learners · K–S

A small, self-contained avatar-care and maths game, published at https://jlclass2026.github.io/k-s/.

## Play

Choose one of eight profiles. Make up a nickname, choose from 14 original illustrated avatars, and choose a home colour. Explore the supply garden, feed or water your friend, play together, try four maths activities, or visit the trophy room.

Correct answers earn 2 EVO and one supply. Incorrect answers offer a useful strategy and unlimited retries. There are no warning counts, punishment mechanics, lockouts, timers, health decay, daily streaks, pet death, automatic pop-ups or progress loss while away. All activities are freely available.

The starting EVO totals from the previous edition are retained. Resetting a profile starts that profile at 0 EVO with a small welcome supply bag.

## Saving and privacy

- Game progress, nicknames and the movement preference are stored in localStorage under `fier-learners-care-v1`.
- No accounts, backend, analytics, external assets or in-game data transmission.
- Profiles are browser-local shared slots, not authenticated accounts. Anyone using that browser can see or change them; use made-up nicknames.
- Clearing site data, switching devices, or ending a private-browsing session can remove browser-local progress.
- Failed/blocked saves keep the game playable in memory and show an honest unsaved message. Unreadable or unsupported existing saves are preserved rather than silently overwritten; that visit stays play-only.
- Changes made in another tab refresh the game state and close unfinished edits, so stale drafts cannot overwrite a cross-tab reset.
- Each profile has its own supplies, achievements and settings for its avatar. Motion is a browser-wide preference. System reduced-motion preferences are always respected.
- Resetting requires an explicit confirmation and affects only the selected profile.

No student names or original request photograph are included in the site or repository.

## Develop and verify

Buildless HTML/CSS/JavaScript. No dependencies or installation needed. Serve this directory with any static web server when local preview is supported by your environment.

Files:
- `index.html`: document, shared dialogs and navigation shell
- `styles.css`: responsive layout and reduced-motion styling
- `game.js`: pure game rules, state validation and persistence helpers
- `app.js`: original SVG artwork and browser UI
- `tests/game.test.cjs`: built-in Node test suite

Run:

```
node --check game.js
node --check app.js
node --test tests/game.test.cjs
```

The tests cover all avatars and colours, storage failures and reloads, profile isolation, input validation, 4,000 generated maths questions, repeat-click reward safety, empty inventories, unique automatic trophies, reset isolation and no offline decay.

For UI releases, also check desktop and narrow layouts, keyboard focus, modal Cancel/Escape, browser Back/Forward, all four maths modes, interrupted questions, repeated submissions, care with an empty bag, and a saved profile after reload. GitHub Pages serves the root of `main`.
