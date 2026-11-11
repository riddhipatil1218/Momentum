# CLAUDE.md — working on Momentum

Read `SPEC.md` first. It holds the data model, milestones and the decisions log.

## About the owner
- Beginner programmer. Explain each step briefly; keep code clean and commented.
- **Ask before** any hard-to-undo choice: changing the data model, adding a library or
  build step, renaming the database, or changing where the app is hosted.
- Build one milestone at a time. After each: say how to run it and what to check.
- Record every new decision in the SPEC.md decisions log (next number, one line of "why").
- Xcode isn't an option on the owner's Mac, so the app is a web app added to the Home Screen.
- **The repo is PUBLIC.** Never put personal stats, targets, weights, names, emails or keys in
  code, tests, docs or commit messages. Tests use made-up example people (SPEC D30).

## Project facts
- Plain HTML/CSS/JavaScript ES modules in `app/`. **No libraries, no bundler, no build step.**
- The `app/` folder is exactly what gets published.
- Tests: `npm test` (Node's built-in runner, `TZ=America/Los_Angeles`). Pure logic lives in
  `app/js/logic/` and must not touch `document`/`window` so Node can import it.
- Preview: `npm start`, then open http://localhost:8000 (needs python3).
- Units: lb, miles, minutes, °F.

## Change workflow (SPEC D33)
1. Make the change in `app/` (+ tests), run `npm test`, check it phone-sized in light and dark.
2. `bash tools/prototype/build.sh`, then republish the prototype to the SAME claude.ai artifact
   (https://claude.ai/artifact/7YVDwKq4nbXLQAwYpThENj) so the owner can try it.
3. Only after the owner approves: commit and push to `main`; GitHub tests and publishes it.
- Never use `alert()`/`confirm()`/`prompt()`; build confirmations into the page.

## Data safety rules (never break these)
1. The IndexedDB name is `momentum`. Never change it.
2. Never edit or remove an entry in `MIGRATIONS` (db.js). To change the data, append a new
   migration function. Ask the owner first.
3. Never delete the database to "fix" an error.
4. Archive activity types and supplements; never delete them.
5. Days are `dayKey` numbers (`YYYYMMDD`) from `dayKeyFromDate`. Look things up by dayKey, not raw dates.
6. Writes go through `db.js`, which fires `momentum:changed` so screens redraw.

## Secrets
- The Anthropic API key is typed into Settings and stored only on the phone.
  Never hard-code it, log it, or put it in any file, test or commit.

## Code conventions
- Any user-typed text shown in HTML goes through `escapeHTML`.
- Colors and sizes come from CSS variables in `styles.css` (light + dark versions).
- Screens render HTML strings and handle taps with one delegated `onclick` per root.
- Forms save on input and are not redrawn while typing (sheets with `live: false`).
- Every file starts with a short comment saying what it's for.
- After changing app files, verify in a phone-sized browser (Playwright, iPhone 13 profile)
  in light and dark mode.
