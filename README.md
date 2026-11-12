# Fitness Tracker

Built by Jay Vaghela — Rutgers University, Computer Science.

A single-page web app to track daily fitness: sleep, heart rate, HRV, stress, steps, workouts, weight, water, mood and energy — plus a macro tracker for calories, protein, carbs and fat.

It gives you a daily recovery score, a plain-language summary, and recommendations for sleep, eating, stress, movement and hydration.

**Starts empty — no made-up health history.** Your data is stored only in your browser (localStorage). No account, no server, no data leaves your device.

## Who it's for

Built for someone with an Amazfit Active 2 smartwatch using the Zepp app on iPhone, who wants a simple daily log and macro tracker. It works for anyone — just type or paste your numbers in.

## What's new: AI screenshot reading (optional Groq key, yours, in your browser only)

- Go to **Settings**, paste your own free Groq API key (get one at [console.groq.com](https://console.groq.com) — email signup, no credit card), and press **Save key**. The key is stored only in that browser's localStorage. It is never in the code, never displayed (only "key saved" is shown), and never uploaded to GitHub.
- Then, in the Today tab, attach a Zepp / Apple Health screenshot and press **Read screenshot with AI**. Groq's vision model reads the visible numbers into the form for you to check before you save. Nothing saves until you press **Save today**.
- The model used is `qwen/qwen3.8-27b` — the only vision-capable model on Groq as of Nov 12, 2026 (verified live against Groq's model list; the earlier `qwen/qwen3-vl-32b` name does not exist on Groq, and there is no vision fallback). Tested with a real Groq key on a sample screenshot: 9/9 correct — sleep 7.33h, score 84, deep 90 min, REM 110 min, resting HR 58, HRV 64, stress 32, steps 8432, weight 74.5 kg, with nulls for values not shown.
- Without a key, screenshot reading stays reference-only, exactly as before. If the AI call fails (bad key, rate limit, network), the app shows an honest error and offers paste-as-text / manual entry — it never invents numbers.

## Features

- **Today log:** sleep hours, sleep score, deep/REM minutes, resting/average/max heart rate, HRV, stress, steps, distance, active calories, weight, water, mood, energy, workouts and notes
- **Recovery score (0–100)** + plain-language summary + recommendations for sleep, eating, stress, movement and hydration
- **Macro tracker:** daily targets for calories, protein, carbs and fat with progress bars, meal log, quick-add for 12 common foods, hand-based portion guide, saved meal favourites
- **Input methods:** manual entry, AI screenshot reading (optional, your own Groq key, in your browser only), paste-as-text parsing, CSV import, copy yesterday, one-tap quick log (water, 10-min walk, sleep preset), saved meal and workout favourites
- **Meal photos are a visual log only** — they are never used to estimate calories or macros. You enter those numbers yourself.

## Tech

Plain HTML, CSS and JavaScript. No build step, no dependencies, no backend. Data in `localStorage`. The text parser (`src/parser.js`), the Groq screenshot reader (`src/groq.js`) and the recovery/macro/CSV logic (`src/logic.js`) are separate, testable modules that also work in Node.

## How to run

Open `index.html` in a browser, or serve it locally:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## How to use

1. Pick a date (defaults to today) and fill in the Today form, then **Save today**.
2. **Autofill hub (Today tab):** paste stats text copied/shared from Zepp or Apple Health and press **Parse into form** — check the numbers, then save. Or attach a screenshot: if you saved your own Groq key in Settings, press **Read screenshot with AI**; otherwise look at the screenshot while you type the numbers in (see limits below).
3. **Food tab:** set your macro targets, log meals, use quick-add foods or favourites.
4. **Watch tab:** import a Zepp / Apple Health CSV export to fill past days in bulk. Re-importing the same date replaces it, it does not duplicate it.

## Honest limits — read this before judging the app

- **No live watch sync.** A web page cannot connect directly to Zepp or a smartwatch. The route is: turn on Zepp → Apple Health sync in the Zepp app, then copy the morning numbers in, paste the shared stats text, or import a CSV export.
- **No photo calorie estimation.** A photo of food cannot be accurately turned into calories/macros. Meal photos are a visual log only, by design.
- **Screenshot autofill is optional AI, with your own key only.** With a Groq key saved in Settings, the app calls Groq's vision model to read a screenshot. Without a key, a screenshot is reference-only and is not analysed. The app makes no network calls at all without a key. No key is in this repo — never put one in code, a test, or a commit.
- **No screenshot/text reader is 100% correct on every possible input in the world** — which is why every autofill method fills an editable form that you check before saving. The paste-as-text parser is tested on the samples in `test/parser.test.js` (see below), and the Groq reader is tested with mock API replies in `test/groq.test.js` — those tests prove the parsing and error handling, not that a real Groq call will read every real screenshot perfectly.
- This is a personal tracker, not medical advice. If you have a health concern, talk to a clinician.

## How to test

```bash
node test/parser.test.js
node test/groq.test.js
```

Plain Node, no dependencies. It covers:

- 3 paste-as-text samples: 10/10, 11/11 and 12/12 fields correct, including the tricky case `"Sleep: 6h 45m Score: 71"` (sleep score 71)
- 2 guard tests: a stress score is never mistaken for a sleep score, and a bare `Score 66` after a sleep mention is correctly read as the sleep score
- Recovery-score tests (a good day scores higher than a bad day; an empty log has no score, not a fake 0)
- Macro-total and CSV-import tests

`test/groq.test.js` (mock Groq replies only — no real key, no network) covers:

- A Groq JSON reply parses into the form fields (sleep 7.3, score 84, deep 90, REM 110, resting 58, HRV 64, stress 32, steps 8432, weight 74.5), including a fenced ```json reply
- A stress score is never mistaken for a sleep score in the returned JSON
- Missing fields become null, not invented
- No key, a failed call (bad key, 401), and a non-JSON reply all return an honest error with no numbers
- If the primary vision model is unavailable (404), it retries once with the fallback model

## Project structure

```
index.html          Single-page app
styles.css          Styling
src/parser.js       Paste-as-text parser (browser + Node)
src/groq.js         Optional Groq AI screenshot reading (browser + Node, key in localStorage only)
src/logic.js        Recovery score, summary, recommendations, macros, CSV
src/app.js          UI glue, localStorage
test/parser.test.js Node tests, no dependencies
test/groq.test.js    Node tests with mock Groq replies, no real key, no network
```

## License

MIT — see `LICENSE`.
