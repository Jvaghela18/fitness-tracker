# Recovery & Performance Tracker

Built by Jay Vaghela — Rutgers University, Computer Science.

A single-page daily recovery & performance tracker: sleep, heart rate, HRV, stress, steps, workouts, weight, water, mood and energy — plus a macro tracker for calories, protein, carbs and fat.

It gives you a daily recovery score, a plain-language summary, and recommendations for sleep, eating, stress, movement and hydration.

**Starts empty — no made-up health history.** Your data is stored only in your browser (localStorage). No account, no server, no data leaves your device.

## Who it's for

Built for someone with an Amazfit Active 2 smartwatch using the Zepp app on iPhone, who wants a simple daily log and macro tracker. It works for anyone — just type or paste your numbers in.

## What's new: AI screenshot reading (optional Groq key, yours, in your browser only)

- Go to **Settings**, paste your own free Groq API key (get one at [console.groq.com](https://console.groq.com) — email signup, no credit card), and press **Save key**. The key is stored only in that browser's localStorage. It is never in the code, never displayed (only "key saved" is shown), and never uploaded to GitHub.
- Then, in the Today tab, attach a Zepp / Apple Health screenshot and press **Read screenshot with AI**. Groq's vision model reads the visible numbers into the form for you to check before you save. Nothing saves until you press **Save today**.
- The model used is `qwen/qwen3.8-27b` — the only vision-capable model on Groq as of Nov 12, 2026 (verified live against Groq's model list; the earlier `qwen/qwen3-vl-32b` name does not exist on Groq, and there is no vision fallback). **Tested with a real Groq key on Nov 12, 2026: 9/9 correct on a sample Zepp screenshot** — sleep 7.33h, score 84, deep 90 min, REM 110 min, resting HR 58, HRV 64, stress 32, steps 8432, weight 74.5 kg. That is one sample, not a guarantee for every screenshot, so still check the numbers before saving.
- Without a key, screenshot reading stays reference-only, exactly as before. If the AI call fails (bad key, rate limit, network), the app shows an honest error and offers paste-as-text / manual entry — it never invents numbers.

## Features

- **Today log:** sleep hours, sleep score, deep/REM minutes, resting/average/max heart rate, HRV, stress, steps, distance, active calories, weight, water, mood, energy, workouts and notes
- **Recovery score (0–100)** + plain-language summary + recommendations for sleep, eating, stress, movement and hydration
- **Macro tracker:** daily targets for calories, protein, carbs and fat with progress bars, meal log, quick-add for 12 common foods, hand-based portion guide, saved meal favourites
- **Input methods:** manual entry, AI screenshot reading (optional, your own Groq key, in your browser only), paste-as-text parsing, CSV import, copy yesterday, one-tap quick log (water, 10-min walk, sleep preset), saved meal and workout favourites
- **Meal photos are a visual log only** — they are never used to estimate calories or macros. You enter those numbers yourself.

## Tech

Plain HTML, CSS and JavaScript. No build step, no dependencies. Data in `localStorage` by default — and there is now an optional Java Spring Boot backend in `backend/` (see below) that stores daily logs, meals and goals in an H2 file database when it is running. The text parser (`src/parser.js`), the Groq screenshot reader (`src/groq.js`) and the recovery/macro/CSV logic (`src/logic.js`) are separate, testable modules that also work in Node.

## How to run

Open `index.html` in a browser, or serve it locally:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Backend (optional): Java Spring Boot + REST API

The frontend works fully on its own. If you want your logs stored on a server instead of only in one browser, run the backend in `backend/` — a Maven Spring Boot 3 project (Java 21) with Spring Web, Spring Data JPA and an H2 file database. It follows the Spring "Building REST services" tutorial pattern (JpaRepository, `@RestController`, constructor injection, GET/POST/PUT/DELETE, 404 advice) — adapted from the tutorial's Employee payroll example to this app's real data: daily logs, meals and goals.

### Run it

```bash
cd backend
mvn spring-boot:run
# backend on http://localhost:8080
```

Then serve the frontend in another terminal (from the repo root):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

The frontend (`src/api.js`) tries the backend first and falls back to localStorage when it is not running, so the app never breaks if the backend is off. Daily logs are synced both ways on load; meals and goals stay in localStorage for now.

Data is stored in `backend/data/recovery-db.mv.db` (H2 file database, so it survives restarts). No fake logs are preloaded — the app starts empty. Only the default macro goals (2200 kcal, 150g protein, 250g carbs, 70g fat) are created if none exist. Delete the `backend/data/` folder to start empty again.

### Endpoints

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/health` | `{"status":"ok"}` |
| GET | `/api/logs` | All daily logs |
| POST | `/api/logs` | Create a log (`{"date":"2026-11-13", "sleepHours":7.3, ...}`) |
| GET | `/api/logs/{date}` | One day's log, or 404 |
| PUT | `/api/logs/{date}` | Create or replace one day's log |
| DELETE | `/api/logs/{date}` | Delete one day's log, or 404 |
| GET | `/api/meals?date=2026-11-13` | Meals for a day (or all meals with no `?date=`) |
| POST | `/api/meals` | Add a meal (`{"date":"2026-11-13", "name":"Chicken breast", "calories":165, "protein":31, "carbs":0, "fat":4}`) |
| DELETE | `/api/meals/{id}` | Delete a meal, or 404 |
| GET | `/api/goals` | Macro targets (defaults if none saved) |
| PUT | `/api/goals` | Replace macro targets |
| POST | `/api/screenshot` | Server-side Groq screenshot reading — only if `GROQ_API_KEY` is set on the server; otherwise 501 (see below) |

Example curl flow:

```bash
curl localhost:8080/api/health
# {"status":"ok"}

curl -X POST localhost:8080/api/logs -H 'Content-Type: application/json' \
  -d '{"date":"2026-11-13","sleepHours":7.3,"sleepScore":84,"steps":8432}'
curl localhost:8080/api/logs/2026-11-13
curl -X PUT localhost:8080/api/logs/2026-11-13 -H 'Content-Type: application/json' \
  -d '{"date":"2026-11-13","sleepHours":8,"sleepScore":84,"steps":8432}'
curl -X DELETE localhost:8080/api/logs/2026-11-13
curl localhost:8080/api/logs/2099-01-01
# Could not find daily log 2099-01-01   (HTTP 404)

curl -X POST localhost:8080/api/meals -H 'Content-Type: application/json' \
  -d '{"date":"2026-11-13","name":"Chicken breast","calories":165,"protein":31,"carbs":0,"fat":4}'
curl 'localhost:8080/api/meals?date=2026-11-13'
```

Backend tests: `cd backend && mvn test` (health, 404 for a missing log, default goals).

### Server-side screenshot reading (optional)

`POST /api/screenshot` (multipart `image` field) calls Groq's vision model `qwen/qwen3.8-27b` from the server — but only if the `GROQ_API_KEY` environment variable is set when the backend starts:

```bash
GROQ_API_KEY=your-key-here mvn spring-boot:run
```

Without a server key it returns 501 and tells you to use the browser Settings key instead. The browser route (`src/groq.js`, key in localStorage only) is the working one and stays as it is. Never put a key in code, in a test, or in a commit — and never paste one in chat.

### VS Code — what Jay does after pulling

I cannot connect to VS Code on your own computer — there is no such access — so everything needed is in the repo instead:

1. Open this repo folder in VS Code.
2. Accept the recommended extensions when VS Code offers them (also in `.vscode/extensions.json`): **Extension Pack for Java** (`vscjava.vscode-java-pack`) and **Spring Boot Extension Pack** (`vmware.vscode-spring-boot`).
3. Press **F5** (or Run → Start Debugging) with the launch config "Run Recovery Backend (Spring Boot, port 8080)" in `.vscode/launch.json` — it runs `com.recovery.RecoveryApplication` from `backend/` on port 8080. Or use Terminal → Run Task → "Run backend (Spring Boot, port 8080)" from `.vscode/tasks.json`.
4. Run the "Serve frontend (port 8000)" task too, then open http://localhost:8000.
5. Alternative: reopen the folder in a container (Command Palette → "Dev Containers: Reopen in Container") — `.devcontainer/devcontainer.json` uses the Java 21 + Maven image (`mcr.microsoft.com/devcontainers/java:21`) with those extensions preinstalled, and forwards ports 8080 and 8000.

### Honest limit

The backend runs **locally** — it is not deployed to the internet. Anyone else opening the app without running the backend just gets the localStorage version, which is the same app, minus server storage.

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
- If the primary vision model is unavailable (404), it returns an honest error with no numbers — there is no other vision model on Groq to fall back to

## Project structure

```
index.html          Single-page app
styles.css          Styling
src/parser.js       Paste-as-text parser (browser + Node)
src/groq.js         Optional Groq AI screenshot reading (browser + Node, key in localStorage only)
src/api.js          Optional backend client (tries localhost:8080, falls back to localStorage)
src/logic.js        Recovery score, summary, recommendations, macros, CSV
src/app.js          UI glue, localStorage (+ backend sync for daily logs when it is running)
test/parser.test.js Node tests, no dependencies
test/groq.test.js    Node tests with mock Groq replies, no real key, no network
backend/            Java 21 Spring Boot REST backend (Web, JPA, H2 file DB)
  pom.xml           Maven build (Spring Boot 3.3.5)
  src/main/java/com/recovery/  RecoveryApplication, DailyLog, Meal, Goal,
                    repositories, controllers, 404 advice, CORS, screenshot endpoint
  src/test/java/com/recovery/  Backend tests (health, 404, default goals)
.vscode/            VS Code settings, launch config, tasks, recommended extensions
.devcontainer/      Dev container (Java 21 + Maven) for VS Code
```

## License

MIT — see `LICENSE`.
