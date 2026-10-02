# Inner Sanctuary

Inner Sanctuary is a small, interactive space for practicing reparenting: noticing a harsh inner voice, answering it with more care, and choosing one grounding action. The page keeps the practice optional and user-led. It is a personal reflection tool, not therapy or a clinical resource.

## The experience

- **A guided dialogue:** choose one of four feelings to see a possible old thought, a steadier response, and one small action.
- **Four care practices:** brief prompts for steady care, play, emotional steadiness, and self-compassion.
- **A returning ritual:** three short steps to pause, listen for a need, and choose a response.
- **A breathing studio:** 4-7-8, box, coherent and physiological-sigh techniques with a guided circle, countdown, 1/2/5 minute sessions and an optional soft sound cue.
- **Gentle play:** bubbles, a ripple pond, a gratitude garden and a mandala, with no scores or timers.
- **A mood check-in** that suggests a breathing technique or the play space.
- **Calm interactions:** a soft cursor glow, slow scroll reveals and gentle parallax, all switched off for visitors who prefer reduced motion.
- **A local check-in:** write an optional note, choose a need, and keep up to five notes in this browser. Notes are not sent to an account or server. Remove one note or clear all notes at any time. If browser storage is unavailable, a note is held only for the current visit.
- **Light and dark appearance:** follows the device preference until changed, then remembers the choice on this device when browser storage is available.

The page does not ask for an account, make third-party requests, diagnose or personalize advice. Reflection text is rendered as text and stays in browser storage only. The page uses system fonts so the layout remains self-contained and works offline.

## Run locally

Use Node.js 20 or newer and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173). The site is plain HTML, CSS and JavaScript modules; Vercel can serve the files as a static site without a build step.

## Checks

```sh
pnpm run check
pnpm test
```

The browser tests use Playwright Chromium and run offline against a local static server. GitHub Actions installs Chromium, checks JavaScript syntax, and runs the unit and browser suites on pull requests and pushes to `main`.

