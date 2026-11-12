// Plain Node tests — no dependencies. Run: node test/parser.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSharedText } = require('../src/parser.js');
const { computeRecovery, macroTotals, parseCsv } = require('../src/logic.js');

function check(actual, expected, label) {
  for (const [k, v] of Object.entries(expected)) {
    assert.equal(actual[k], v, `${label}: ${k} expected ${v}, got ${actual[k]}`);
  }
}

test('sample 1: 10/10 fields', () => {
  const r = parseSharedText('Sleep 7h 20m, Sleep score 84, Deep sleep 90 min, REM 1h 50m, Resting HR 58 bpm, HRV 64 ms, Stress 32, Steps 8432, Distance 5.8 km, Weight 74.5 kg');
  check(r, { sleepHours: 7.3, sleepScore: 84, deepSleepMin: 90, remSleepMin: 110, restingHr: 58, hrvMs: 64, stressScore: 32, steps: 8432, distanceKm: 5.8, weightKg: 74.5 }, 'sample 1');
});

test('sample 2: 11/11 fields, incl. bare "Score: 71"', () => {
  const r = parseSharedText('Sleep: 6h 45m Score: 71 / Deep: 55 min REM: 1h 05m / Resting HR: 61 bpm Max HR: 142 bpm / HRV: 48 ms / Stress level: 58 / Steps: 10234 Distance: 7.2 km / Weight: 73.9 kg');
  check(r, { sleepHours: 6.8, sleepScore: 71, deepSleepMin: 55, remSleepMin: 65, restingHr: 61, maxHr: 142, hrvMs: 48, stressScore: 58, steps: 10234, distanceKm: 7.2, weightKg: 73.9 }, 'sample 2');
});

test('sample 3: 12/12 fields', () => {
  const r = parseSharedText('Sleep 8h 05m, sleep score 92, deep sleep 1h 30m, REM sleep 2h 10m, resting heart rate 55, avg HR 72, max HR 168, HRV 81 ms, stress 18, steps 5120, active calories 380 kcal, weight 75.2 kg');
  check(r, { sleepHours: 8.1, sleepScore: 92, deepSleepMin: 90, remSleepMin: 130, restingHr: 55, avgHr: 72, maxHr: 168, hrvMs: 81, stressScore: 18, steps: 5120, activeCalories: 380, weightKg: 75.2 }, 'sample 3');
});

test('guard 1: stress score is NOT a sleep score', () => {
  const r = parseSharedText('Sleep 7h 10m, Stress score 45, Steps 6000');
  assert.equal(r.sleepScore, null, 'sleepScore must be null');
  assert.equal(r.stressScore, 45);
  assert.equal(r.steps, 6000);
});

test('guard 2: bare Score after sleep IS a sleep score', () => {
  const r = parseSharedText('Sleep 7h 00m Score 66, Steps 7000, Stress 20');
  assert.equal(r.sleepScore, 66);
  assert.equal(r.stressScore, 20);
});

test('empty text returns all null', () => {
  const r = parseSharedText('');
  assert.equal(Object.values(r).every(v => v === null), true);
});

test('recovery score: good day scores high, empty log is null', () => {
  const good = computeRecovery({ sleepHours: 7.3, sleepScore: 84, hrvMs: 64, restingHr: 58, stressScore: 32, steps: 8432 });
  assert.ok(good >= 70 && good <= 100, `good day should score 70-100, got ${good}`);
  assert.equal(computeRecovery({}), null);
  const bad = computeRecovery({ sleepHours: 4, sleepScore: 40, hrvMs: 30, restingHr: 80, stressScore: 90, steps: 1000 });
  assert.ok(bad < good, `bad day (${bad}) should score below good day (${good})`);
});

test('macro totals add up', () => {
  const t = macroTotals([
    { calories: 400, protein: 30, carbs: 40, fat: 12 },
    { calories: 650, protein: 45, carbs: 70, fat: 20 },
  ]);
  assert.deepEqual(t, { calories: 1050, protein: 75, carbs: 110, fat: 32 });
});

test('CSV import parses Zepp-style rows', () => {
  const rows = parseCsv('date,sleep_hours,sleep_score,deep_min,rem_min,resting_hr,hrv_ms,stress,steps,weight_kg\n2026-11-10,7.3,84,90,110,58,64,32,8432,74.5\n2026-11-11,6.8,71,55,65,61,48,58,10234,73.9');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].sleepScore, 84);
  assert.equal(rows[1].steps, 10234);
  assert.equal(rows[1].weightKg, 73.9);
});
