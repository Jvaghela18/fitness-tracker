// logic.js — recovery score, summary/recommendations, macro totals.
// Pure functions, no DOM, testable in Node and in the browser.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FitnessLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // Recovery 0-100. Sleep hours (target 8h) 30pts, sleep score 25pts,
  // HRV 15pts, resting HR 10pts, stress 10pts, steps 10pts.
  function computeRecovery(log) {
    const l = log || {};
    let s = 0;
    if (l.sleepHours != null) s += clamp(l.sleepHours / 8, 0, 1) * 30;
    if (l.sleepScore != null) s += clamp(l.sleepScore / 100, 0, 1) * 25;
    if (l.hrvMs != null) s += clamp(l.hrvMs / 80, 0, 1) * 15;
    if (l.restingHr != null) s += clamp((90 - l.restingHr) / 40, 0, 1) * 10;
    if (l.stressScore != null) s += clamp((100 - l.stressScore) / 100, 0, 1) * 10;
    if (l.steps != null) s += clamp(l.steps / 10000, 0, 1) * 10;
    // No data at all -> no score, not a fake 0.
    const hasAny = ['sleepHours', 'sleepScore', 'hrvMs', 'restingHr', 'stressScore', 'steps']
      .some(k => l[k] != null);
    return hasAny ? Math.round(s) : null;
  }

  function recoveryLabel(score) {
    if (score == null) return 'No data yet — log a day to get your recovery score.';
    if (score >= 80) return 'Great recovery — you are well rested and ready for a hard day.';
    if (score >= 60) return 'Good recovery — solid, with a little room to improve sleep or stress.';
    if (score >= 40) return 'Okay recovery — take it a bit easier today and prioritise sleep.';
    return 'Low recovery — rest, hydrate, and keep today light.';
  }

  function recommendations(log) {
    const l = log || {};
    const out = { sleep: [], eating: [], stress: [], movement: [], hydration: [] };
    if (l.sleepHours != null && l.sleepHours < 7) out.sleep.push('You slept under 7 hours — aim for 7–9 hours tonight, and keep a regular bedtime.');
    else if (l.sleepHours != null) out.sleep.push('Sleep length looks good — keep the same bedtime tonight.');
    else out.sleep.push('No sleep logged yet — log your sleep to get a sleep recommendation.');
    if (l.sleepScore != null && l.sleepScore < 70) out.sleep.push('Sleep score is low — avoid screens and caffeine late in the day.');
    if (l.stressScore != null && l.stressScore >= 50) {
      out.stress.push('Stress is high — try a 10-minute walk, slow breathing, or a break from screens.');
    } else if (l.stressScore != null) out.stress.push('Stress looks manageable today.');
    else out.stress.push('No stress logged yet.');
    if (l.steps != null && l.steps < 5000) out.movement.push('Under 5,000 steps — add a 10-minute walk.');
    else if (l.steps != null) out.movement.push('Good movement today — keep it up.');
    else out.movement.push('No steps logged yet.');
    out.hydration.push('Aim for about 2 litres of water a day; log water as you go.');
    out.eating.push('Aim for protein with each meal, and log meals to see your macros against your targets.');
    return out;
  }

  function summary(log) {
    const l = log || {};
    const parts = [];
    if (l.sleepHours != null) parts.push(`slept ${l.sleepHours}h` + (l.sleepScore != null ? ` (score ${l.sleepScore})` : ''));
    if (l.steps != null) parts.push(`${l.steps.toLocaleString()} steps`);
    if (l.restingHr != null) parts.push(`resting HR ${l.restingHr} bpm`);
    if (l.stressScore != null) parts.push(`stress ${l.stressScore}`);
    if (!parts.length) return 'No data logged for this day yet.';
    return 'Today you ' + parts.join(', ') + '.';
  }

  function macroTotals(meals) {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    (meals || []).forEach(m => {
      t.calories += m.calories || 0; t.protein += m.protein || 0;
      t.carbs += m.carbs || 0; t.fat += m.fat || 0;
    });
    return t;
  }

  // Parse a Zepp / Apple Health style CSV. Header names are matched loosely;
  // returns an array of {date, ...parsed fields}. Unknown columns are ignored.
  function parseCsv(text) {
    const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const split = l => l.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    const headers = split(lines[0]).map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
    const rows = [];
    for (const line of lines.slice(1)) {
      const cells = split(line);
      const row = { date: cells[0] || '' };
      headers.forEach((h, i) => {
        const v = cells[i]; if (v === undefined || v === '') return;
        const n = parseFloat(v);
        if (h.includes('sleep') && h.includes('score')) row.sleepScore = n;
        else if (h.includes('sleephours') || h === 'sleep') row.sleepHours = n;
        else if (h.includes('deep')) row.deepSleepMin = n;
        else if (h.includes('rem')) row.remSleepMin = n;
        else if (h.includes('resting')) row.restingHr = n;
        else if (h.includes('hrv')) row.hrvMs = n;
        else if (h.includes('stress')) row.stressScore = n;
        else if (h.includes('steps')) row.steps = n;
        else if (h.includes('distance')) row.distanceKm = n;
        else if (h.includes('weight')) row.weightKg = n;
        else if (h.includes('calories')) row.activeCalories = n;
      });
      rows.push(row);
    }
    return rows;
  }

  return { computeRecovery, recoveryLabel, recommendations, summary, macroTotals, parseCsv };
});
