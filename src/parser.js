// parseSharedText — deterministic parser for Zepp / Apple Health shared stats text.
// No AI, no network. Returns null for any field not found.
// Fields: sleepHours, sleepScore, deepSleepMin, remSleepMin, restingHr, avgHr,
// maxHr, hrvMs, stressScore, steps, distanceKm, activeCalories, weightKg
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FitnessParser = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function round1(n) { return Math.round(n * 10) / 10; }

  function durationAfter(text, re) {
    const m = text.match(re);
    if (!m) return null;
    if (m[2] !== undefined && m[2] !== '') return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return parseInt(m[1], 10);
  }

  // Duration like "1h 30m" or "90 min" after a keyword, e.g. Deep / REM.
  function parseDuration(text, keyword) {
    // "Deep sleep 1h 30m" / "Deep: 1h 05m" / "REM sleep 2h 10m"
    let m = text.match(new RegExp(keyword + '[^0-9]{0,12}(\\d+)\\s*h(?:\\s*(\\d+)\\s*m)?', 'i'));
    if (m) return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
    // "Deep sleep 90 min" / "Deep: 55 min"
    m = text.match(new RegExp(keyword + '[^0-9]{0,12}(\\d+)\\s*min', 'i'));
    if (m) return parseInt(m[1], 10);
    return null;
  }

  function sleepScore(text) {
    // Every "Score <n>" in the text; accept only if "sleep" appears in the
    // ~50 chars before it and "stress" does not. This is what stops a
    // stress score being mistaken for a sleep score.
    const re = /\bscore\s*:?\s*(\d{1,3})\b/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 50), m.index).toLowerCase();
      if (/\bstress\b/.test(before)) continue;
      if (/\bsleep\b/.test(before)) return parseInt(m[1], 10);
    }
    return null;
  }

  function num(text, re) {
    const m = text.match(re);
    return m ? parseFloat(m[1].replace(/,/g, '')) : null;
  }

  function parseSharedText(text) {
    const t = String(text || '');
    const out = {
      sleepHours: null, sleepScore: null, deepSleepMin: null, remSleepMin: null,
      restingHr: null, avgHr: null, maxHr: null, hrvMs: null, stressScore: null,
      steps: null, distanceKm: null, activeCalories: null, weightKg: null,
    };
    // Sleep hours: "Sleep 7h 20m" / "Sleep: 6h 45m" / "Sleep 8h 05m"
    const sm = t.match(/sleep[^0-9]{0,4}(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
    if (sm) out.sleepHours = round1(parseInt(sm[1], 10) + (sm[2] ? parseInt(sm[2], 10) / 60 : 0));

    out.sleepScore = sleepScore(t);
    out.deepSleepMin = parseDuration(t, 'deep');
    out.remSleepMin = parseDuration(t, 'rem');
    out.restingHr = num(t, /resting(?:\s+heart\s+rate|\s+hr)?\s*:?\s*(\d{2,3})/i);
    out.avgHr = num(t, /avg(?:\s+hr|\s+heart\s+rate)?\s*:?\s*(\d{2,3})/i);
    out.maxHr = num(t, /max(?:\s+hr|\s+heart\s+rate)?\s*:?\s*(\d{2,3})/i);
    out.hrvMs = num(t, /hrv\s*:?\s*(\d{1,3})/i);
    out.stressScore = num(t, /stress(?:\s+level|\s+score)?\s*:?\s*(\d{1,3})/i);
    out.steps = num(t, /steps\s*:?\s*([\d,]+)/i);
    out.distanceKm = num(t, /distance\s*:?\s*([\d.]+)\s*km/i);
    out.activeCalories = num(t, /active\s+calories\s*:?\s*(\d+)/i);
    out.weightKg = num(t, /weight\s*:?\s*([\d.]+)\s*kg/i);
    return out;
  }

  return { parseSharedText };
});
