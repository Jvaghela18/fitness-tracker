// groq.js — optional AI screenshot reading via Groq (OpenAI-compatible API).
// No key is stored here. The user enters their own Groq key in the app's
// Settings box; the app keeps it only in that browser's localStorage.
// Without a key, screenshot reading is not attempted at all.
// Pure functions + one async caller, testable in Node with a mock fetch.
// Fields: sleepHours, sleepScore, deepSleepMin, remSleepMin, restingHr, avgHr,
// maxHr, hrvMs, stressScore, steps, distanceKm, activeCalories, weightKg
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FitnessGroq = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const PRIMARY_MODEL = 'qwen/qwen3.8-27b';
  // No fallback vision model: as of Nov 12, 2026, qwen3.8-27b was the only
  // vision-capable (image input) model in Groq's /openai/v1/models list.
  // The earlier names qwen/qwen3-vl-32b and meta-llama/llama-4-scout-17b-16e-instruct
  // do not exist on Groq (verified live: both return model_not_found).
  const FALLBACK_MODEL = null;
  const STAT_FIELDS = ['sleepHours', 'sleepScore', 'deepSleepMin', 'remSleepMin', 'restingHr', 'avgHr', 'maxHr', 'hrvMs', 'stressScore', 'steps', 'distanceKm', 'activeCalories', 'weightKg'];

  function cleanNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  // Normalise any object the model returns: known fields only, numbers or
  // null. Anything missing, blank, or non-numeric becomes null — never
  // invented. Sleep and stress scores are separate fields, so a stress
  // score is never copied into sleepScore.
  function normalizeStats(obj) {
    const src = obj && typeof obj === 'object' ? obj : {};
    const out = {};
    STAT_FIELDS.forEach(k => { out[k] = cleanNumber(src[k]); });
    return out;
  }

  // The model should return ONLY JSON, but be tolerant of a fenced block
  // (```json ... ```) or surrounding text. Throws on invalid JSON.
  function parseGroqContent(content) {
    if (content && typeof content === 'object') return normalizeStats(content);
    const text = String(content || '');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Groq returned text that was not JSON, so no numbers were taken from it.');
    }
    let parsed;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch (e) {
      throw new Error('Groq returned text that was not JSON, so no numbers were taken from it.');
    }
    return normalizeStats(parsed);
  }

  function contentText(message) {
    const c = message && message.content;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) return c.map(p => (p && p.text) || '').join('\n');
    return '';
  }

  async function callOnce({ apiKey, imageDataUrl, mimeType, model, fetchFn }) {
    const body = {
      model,
      messages: [
        { role: 'system', content: 'You read health stats from a screenshot. Return ONLY a JSON object, no other text. Keys: sleepHours, sleepScore, deepSleepMin, remSleepMin, restingHr, avgHr, maxHr, hrvMs, stressScore, steps, distanceKm, activeCalories, weightKg. Use null for any value not visible in the image. Do not guess. sleepScore is the sleep score only; a stress score goes in stressScore, never in sleepScore.' },
        { role: 'user', content: [
          { type: 'text', text: 'Read the visible health stats from this screenshot and return them as JSON only.' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ] },
      ],
      temperature: 0,
      max_tokens: 600,
    };
    const res = await fetchFn(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = '';
      try { const e = await res.json(); detail = (e && e.error && e.error.message) || ''; } catch { /* ignore */ }
      const err = new Error('Groq call failed (' + res.status + ')' + (detail ? ': ' + detail : '') + '. No numbers were taken from the screenshot.');
      err.status = res.status;
      err.detail = detail;
      throw err;
    }
    const data = await res.json();
    const text = contentText(data && data.choices && data.choices[0] && data.choices[0].message);
    return parseGroqContent(text);
  }

  // Main entry. Throws an honest Error (never returns invented numbers) when
  // there is no key, the call fails, or the reply is not usable JSON.
  // If the vision model is unavailable (404 / model error), there is no
  // other vision model on Groq to fall back to, so that error is surfaced
  // honestly instead of retrying a model that does not exist.
  async function extractStatsFromScreenshot(opts) {
    const o = opts || {};
    if (!o.apiKey || !String(o.apiKey).trim()) {
      throw new Error('No Groq API key saved. Save your own key in Settings, or use paste-as-text / manual entry instead. No numbers were taken from the screenshot.');
    }
    if (!o.imageDataUrl) throw new Error('No screenshot image was provided.');
    const fetchFn = o.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) throw new Error('No network fetch available in this environment.');
    try {
      const stats = await callOnce({ apiKey: o.apiKey, imageDataUrl: o.imageDataUrl, mimeType: o.mimeType || 'image/jpeg', model: PRIMARY_MODEL, fetchFn });
      return { stats, modelUsed: PRIMARY_MODEL };
    } catch (e) {
      const msg = String((e && e.message) || '');
      const modelUnavailable = e.status === 404 || /model/i.test(msg) && /not (found|available|exist)/i.test(msg);
      if (!modelUnavailable || !FALLBACK_MODEL) throw e;
      const stats = await callOnce({ apiKey: o.apiKey, imageDataUrl: o.imageDataUrl, mimeType: o.mimeType || 'image/jpeg', model: FALLBACK_MODEL, fetchFn });
      return { stats, modelUsed: FALLBACK_MODEL };
    }
  }

  return { GROQ_URL, PRIMARY_MODEL, FALLBACK_MODEL, STAT_FIELDS, normalizeStats, parseGroqContent, extractStatsFromScreenshot };
});
