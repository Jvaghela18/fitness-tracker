// Plain Node tests for src/groq.js — mock fetch only, no real key, no network.
// Run: node test/groq.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeStats, parseGroqContent, extractStatsFromScreenshot, PRIMARY_MODEL, FALLBACK_MODEL } = require('../src/groq.js');

const SAMPLE_JSON = JSON.stringify({
  sleepHours: 7.3, sleepScore: 84, deepSleepMin: 90, remSleepMin: 110,
  restingHr: 58, avgHr: null, maxHr: null, hrvMs: 64, stressScore: 32,
  steps: 8432, distanceKm: null, activeCalories: null, weightKg: 74.5,
});

function mockFetchOk(content, modelSeen) {
  return async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (modelSeen) modelSeen.push(body.model);
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.ok(String(opts.headers.Authorization).startsWith('Bearer '), 'must send a Bearer key');
    assert.ok(body.messages[1].content[1].image_url.url.startsWith('data:image/jpeg;base64,'), 'must send the screenshot as a base64 image');
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) };
  };
}

test('(a) Groq JSON parses into the form fields — sample values', async () => {
  const { stats, modelUsed } = await extractStatsFromScreenshot({
    apiKey: 'gsk_test_mock_key', imageDataUrl: 'data:image/jpeg;base64,/9j/mock',
    fetchFn: mockFetchOk(SAMPLE_JSON),
  });
  assert.equal(modelUsed, PRIMARY_MODEL);
  assert.deepEqual(stats, {
    sleepHours: 7.3, sleepScore: 84, deepSleepMin: 90, remSleepMin: 110,
    restingHr: 58, avgHr: null, maxHr: null, hrvMs: 64, stressScore: 32,
    steps: 8432, distanceKm: null, activeCalories: null, weightKg: 74.5,
  });
});

test('(a2) fenced ```json reply also parses', () => {
  const r = parseGroqContent('```json\n' + SAMPLE_JSON + '\n```');
  assert.equal(r.sleepHours, 7.3);
  assert.equal(r.steps, 8432);
});

test('(b) stress score is not mistaken for a sleep score', async () => {
  const content = JSON.stringify({ sleepHours: 7.2, sleepScore: null, deepSleepMin: null, remSleepMin: null, restingHr: 60, avgHr: null, maxHr: null, hrvMs: 50, stressScore: 45, steps: 6000, distanceKm: null, activeCalories: null, weightKg: null });
  const { stats } = await extractStatsFromScreenshot({
    apiKey: 'gsk_test_mock_key', imageDataUrl: 'data:image/jpeg;base64,/9j/mock',
    fetchFn: mockFetchOk(content),
  });
  assert.equal(stats.sleepScore, null, 'sleepScore must stay null');
  assert.equal(stats.stressScore, 45);
});

test('(c) missing fields become null, not invented', () => {
  const r = normalizeStats({ sleepHours: 7.3 });
  assert.equal(r.sleepHours, 7.3);
  assert.equal(r.sleepScore, null);
  assert.equal(r.steps, null);
  assert.equal(r.weightKg, null);
  assert.equal(Object.keys(r).length, 13);
});

test('(d1) no key returns an honest error, no numbers', async () => {
  await assert.rejects(
    extractStatsFromScreenshot({ apiKey: '', imageDataUrl: 'data:image/jpeg;base64,/9j/mock', fetchFn: mockFetchOk(SAMPLE_JSON) }),
    /No Groq API key/
  );
});

test('(d2) failed call (bad key, 401) returns an honest error, no numbers', async () => {
  const badFetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Incorrect API key provided' } }) });
  await assert.rejects(
    extractStatsFromScreenshot({ apiKey: 'gsk_bad_mock', imageDataUrl: 'data:image/jpeg;base64,/9j/mock', fetchFn: badFetch }),
    /Groq call failed \(401\)/
  );
});

test('(d3) non-JSON reply returns an honest error, no numbers', async () => {
  await assert.rejects(
    extractStatsFromScreenshot({ apiKey: 'gsk_test_mock_key', imageDataUrl: 'data:image/jpeg;base64,/9j/mock', fetchFn: mockFetchOk('Sorry, I cannot read that.') }),
    /not JSON/
  );
});

test('no fallback vision model: primary model unavailable (404) gives an honest error, no numbers', async () => {
  const seen = [];
  const fetchFn = async (url, opts) => {
    const body = JSON.parse(opts.body);
    seen.push(body.model);
    return { ok: false, status: 404, json: async () => ({ error: { message: 'model not found' } }) };
  };
  await assert.rejects(
    extractStatsFromScreenshot({ apiKey: 'gsk_test_mock_key', imageDataUrl: 'data:image/jpeg;base64,/9j/mock', fetchFn }),
    /model not found/
  );
  assert.deepEqual(seen, [PRIMARY_MODEL], 'must not retry a fallback model that does not exist');
  assert.equal(FALLBACK_MODEL, null);
});
