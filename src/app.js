// app.js — UI glue over src/parser.js + src/logic.js. The Spring Boot
// backend is the primary store when it is running; localStorage is the
// offline fallback when it is not.
(function () {
  const $ = id => document.getElementById(id);
  const LOG_FIELDS = ['sleepHours','sleepScore','deepSleepMin','remSleepMin','restingHr','avgHr','maxHr','hrvMs','stressScore','steps','distanceKm','activeCalories','weightKg','waterMl','mood','energy','workout','notes'];
  const QUICK_FOODS = [
    ['Chicken breast (100g)', 165, 31, 0, 4], ['Rice, cooked (1 cup)', 205, 4, 45, 0],
    ['Eggs (2)', 140, 12, 1, 10], ['Greek yogurt (170g)', 100, 17, 6, 0],
    ['Oats (40g)', 150, 5, 27, 3], ['Banana', 105, 1, 27, 0],
    ['Bread (2 slices)', 160, 5, 30, 2], ['Peanut butter (2 tbsp)', 190, 8, 6, 16],
    ['Salmon (100g)', 208, 20, 0, 13], ['Pasta, cooked (1 cup)', 220, 8, 43, 1],
    ['Apple', 95, 0, 25, 0], ['Milk (250ml)', 150, 8, 12, 8],
  ];
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  };
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const dateVal = () => $('date').value || todayStr();
  const logs = () => store.get('ft_logs', {});
  // Backend: the Spring Boot backend is part of the app and the primary
  // store for logs, meals and goals. If it is not running, everything
  // still works from localStorage alone — that is the offline fallback,
  // not the normal mode.
  const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70 };
  const mealKey = m => [m.name, m.calories, m.protein, m.carbs, m.fat].join('|');
  let backendOn = false;
  async function syncFromBackend() {
    try {
      if (typeof FitnessApi === 'undefined') return;
      backendOn = await FitnessApi.health();
      if (!backendOn) return;
      // Logs: merge both ways so nothing is lost — local first, backend
      // wins on the same date, then push any local-only dates up.
      const remote = await FitnessApi.getAllLogs();
      if (!remote) { backendOn = false; return; }
      const local = logs();
      const merged = { ...local, ...remote };
      store.set('ft_logs', merged);
      for (const [d, l] of Object.entries(local)) {
        if (!remote[d]) await FitnessApi.saveLog(d, l);
      }
      // Goals: one row. If the local goals are still the defaults, take
      // the backend's; if the local ones were changed, push them up.
      const remoteGoals = await FitnessApi.getGoals();
      if (remoteGoals) {
        const localGoals = store.get('ft_goals', DEFAULT_GOALS);
        const isDefault = ['calories', 'protein', 'carbs', 'fat']
          .every(k => localGoals[k] === DEFAULT_GOALS[k]);
        if (isDefault) {
          store.set('ft_goals', { calories: remoteGoals.calories, protein: remoteGoals.protein, carbs: remoteGoals.carbs, fat: remoteGoals.fat });
        } else {
          await FitnessApi.saveGoals(localGoals);
        }
      }
      // Meals: backend meals carry an id; local ones may not. Start from
      // the backend's meals, then post any local-only meal (matched by
      // date + name + macros) so it gets an id and is not duplicated.
      const remoteMeals = await FitnessApi.getAllMeals();
      if (remoteMeals) {
        const seen = new Set(remoteMeals.map(m => m.date + '|' + mealKey(m)));
        const mergedMeals = {};
        remoteMeals.forEach(m => { (mergedMeals[m.date] = mergedMeals[m.date] || []).push(m); });
        const localMeals = store.get('ft_meals', {});
        for (const [d, list] of Object.entries(localMeals)) {
          for (const m of list) {
            if (seen.has(d + '|' + mealKey(m))) continue;
            const saved = await FitnessApi.addMeal({ ...m, date: d });
            (mergedMeals[d] = mergedMeals[d] || []).push(saved || m);
          }
        }
        store.set('ft_meals', mergedMeals);
      }
    } catch { backendOn = false; }
  }
  const mealsFor = d => store.get('ft_meals', {})[d] || [];

  function status(msg) { $('status').textContent = msg; setTimeout(() => $('status').textContent = '', 4000); }

  function loadLog() {
    const log = logs()[dateVal()] || {};
    LOG_FIELDS.forEach(f => { const el = $(f); if (el) el.value = log[f] ?? ''; });
    renderInsights(log);
    renderMeals();
  }
  function readLog() {
    const log = {};
    LOG_FIELDS.forEach(f => {
      const el = $(f); if (!el) return;
      const v = el.value.trim();
      log[f] = v === '' ? null : (el.type === 'number' ? Number(v) : v);
    });
    return log;
  }
  function renderInsights(log) {
    const score = FitnessLogic.computeRecovery(log);
    $('recoveryScore').textContent = score == null ? '—' : score + ' / 100';
    $('recoveryLabel').textContent = FitnessLogic.recoveryLabel(score);
    $('summary').textContent = FitnessLogic.summary(log);
    const recs = FitnessLogic.recommendations(log);
    $('recommendations').innerHTML = Object.entries(recs).map(([k, vs]) =>
      `<h4>${k[0].toUpperCase() + k.slice(1)}</h4><ul>${vs.map(v => `<li>${v}</li>`).join('')}</ul>`).join('');
  }

  function renderMeals() {
    const goals = store.get('ft_goals', { calories: 2200, protein: 150, carbs: 250, fat: 70 });
    ['Calories', 'Protein', 'Carbs', 'Fat'].forEach(k => { $('goal' + k).value = goals[k.toLowerCase()]; });
    const t = FitnessLogic.macroTotals(mealsFor(dateVal()));
    const rows = [['Calories', t.calories, goals.calories, 'kcal'], ['Protein', t.protein, goals.protein, 'g'],
      ['Carbs', t.carbs, goals.carbs, 'g'], ['Fat', t.fat, goals.fat, 'g']];
    $('macroBars').innerHTML = rows.map(([n, v, g, u]) =>
      `<p>${n}: ${v} / ${g} ${u}</p><div class="bar"><div style="width:${Math.min(100, g ? v / g * 100 : 0)}%"></div></div>`).join('');
    $('mealList').innerHTML = mealsFor(dateVal()).map((m, i) =>
      `<li>${m.name} — ${m.calories} kcal, P ${m.protein}g, C ${m.carbs}g, F ${m.fat}g <button data-del-meal="${i}">Delete</button></li>`).join('') || '<li>No meals logged today yet.</li>';
    $('mealList').querySelectorAll('[data-del-meal]').forEach(b => b.onclick = () => {
      const all = store.get('ft_meals', {}); const removed = all[dateVal()].splice(+b.dataset.delMeal, 1)[0]; store.set('ft_meals', all);
      if (backendOn && removed && removed.id && typeof FitnessApi !== 'undefined') FitnessApi.deleteMeal(removed.id);
      renderMeals();
    });
    const favs = store.get('ft_meal_favs', []);
    $('mealFavs').innerHTML = favs.map((f, i) => `<button data-meal-fav="${i}">${f.name}</button>`).join('') || 'No favourite meals saved yet.';
    $('mealFavs').querySelectorAll('[data-meal-fav]').forEach(b => b.onclick = () => {
      const f = favs[+b.dataset.mealFav];
      $('mealName').value = f.name; $('mealCalories').value = f.calories; $('mealProtein').value = f.protein; $('mealCarbs').value = f.carbs; $('mealFat').value = f.fat;
    });
    const wfavs = store.get('ft_workout_favs', []);
    $('workoutFavs').innerHTML = wfavs.map((w, i) => `<button data-wfav="${i}">${w}</button>`).join('') || 'No favourite workouts saved yet.';
    $('workoutFavs').querySelectorAll('[data-wfav]').forEach(b => b.onclick = () => { $('workout').value = wfavs[+b.dataset.wfav]; showTab('today'); });
    $('quickFoods').innerHTML = QUICK_FOODS.map((f, i) => `<button data-qfood="${i}">${f[0]}</button>`).join('');
    $('quickFoods').querySelectorAll('[data-qfood]').forEach(b => b.onclick = () => {
      const f = QUICK_FOODS[+b.dataset.qfood];
      $('mealName').value = f[0]; $('mealCalories').value = f[1]; $('mealProtein').value = f[2]; $('mealCarbs').value = f[3]; $('mealFat').value = f[4];
    });
  }

  function showTab(name) {
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach(s => s.classList.toggle('hidden', s.id !== 'tab-' + name));
  }
  document.querySelectorAll('nav button').forEach(b => b.onclick = () => showTab(b.dataset.tab));

  $('date').value = todayStr();
  $('date').onchange = loadLog;

  $('logForm').onsubmit = e => {
    e.preventDefault();
    const all = logs(); all[dateVal()] = readLog(); store.set('ft_logs', all);
    if (backendOn && typeof FitnessApi !== 'undefined') FitnessApi.saveLog(dateVal(), all[dateVal()]);
    renderInsights(all[dateVal()]); status('Saved.');
  };
  $('deleteLog').onclick = () => { const all = logs(); delete all[dateVal()]; store.set('ft_logs', all); if (backendOn && typeof FitnessApi !== 'undefined') FitnessApi.deleteLog(dateVal()); loadLog(); status('Deleted.'); };
  $('copyYesterday').onclick = () => {
    const d = new Date(dateVal()); d.setDate(d.getDate() - 1);
    const y = logs()[d.toISOString().slice(0, 10)];
    if (!y) { status('No log from yesterday to copy.'); return; }
    LOG_FIELDS.forEach(f => { const el = $(f); if (el) el.value = y[f] ?? ''; });
    status('Copied yesterday — review, then Save today.');
  };
  document.querySelectorAll('[data-water]').forEach(b => b.onclick = () => {
    $('waterMl').value = (Number($('waterMl').value) || 0) + Number(b.dataset.water); status('Water added — press Save today.');
  });
  $('quickWalk').onclick = () => { $('workout').value = '10-min walk'; status('Walk added — press Save today.'); };
  $('quickSleep').onclick = () => { $('sleepHours').value = 8; status('Sleep set to 8h — press Save today.'); };

  $('parseText').onclick = () => {
    const parsed = FitnessParser.parseSharedText($('pasteText').value);
    const found = Object.entries(parsed).filter(([, v]) => v != null);
    if (!found.length) { $('parseResult').textContent = 'No numbers found in that text. Try copying the stats text from Zepp / Apple Health.'; return; }
    found.forEach(([k, v]) => { const el = $(k); if (el) el.value = v; });
    $('parseResult').textContent = `Found ${found.length} stats: ${found.map(([k, v]) => k + ' ' + v).join(', ')}. Check them in the form, then press Save today.`;
    renderInsights(readLog());
  };

  function previewImage(input, container) {
    const file = input.files && input.files[0]; if (!file) return;
    const img = document.createElement('img'); img.className = 'preview'; img.alt = 'Attached screenshot';
    img.src = URL.createObjectURL(file); container.innerHTML = ''; container.appendChild(img);
  }
  $('screenshotFile').onchange = () => previewImage($('screenshotFile'), $('screenshotPreview'));

  // Groq key — stored ONLY in this browser's localStorage, never in code.
  // Only the status is ever shown; the key value is never displayed.
  const groqKey = () => { try { return localStorage.getItem('ft_groq_key') || ''; } catch { return ''; } };
  function refreshGroqStatus() {
    $('groqKeyStatus').textContent = groqKey() ? 'Groq key saved in this browser only.' : 'No Groq key saved — screenshot reading is reference-only. Save your own key above to turn on AI screenshot reading.';
  }
  $('saveGroqKey').onclick = () => {
    const v = $('groqKey').value.trim();
    if (!v) { $('groqKeyStatus').textContent = 'Paste your Groq key first.'; return; }
    localStorage.setItem('ft_groq_key', v);
    $('groqKey').value = '';
    refreshGroqStatus(); status('Groq key saved in this browser only.');
  };
  $('clearGroqKey').onclick = () => {
    localStorage.removeItem('ft_groq_key');
    $('groqKey').value = '';
    refreshGroqStatus(); status('Groq key cleared.');
  };
  $('readScreenshot').onclick = () => {
    const file = $('screenshotFile').files && $('screenshotFile').files[0];
    if (!file) { $('groqResult').textContent = 'Attach a screenshot first.'; return; }
    const key = groqKey();
    if (!key) { $('groqResult').textContent = 'No Groq key saved. Save your own key in Settings to read screenshots with AI, or look at the screenshot while you paste the text or type the numbers in.'; return; }
    $('groqResult').textContent = 'Reading screenshot with Groq AI…';
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { stats, modelUsed } = await FitnessGroq.extractStatsFromScreenshot({ apiKey: key, imageDataUrl: reader.result, mimeType: file.type || 'image/jpeg' });
        const found = Object.entries(stats).filter(([, v]) => v != null);
        if (!found.length) { $('groqResult').textContent = 'The AI could not see any stats in that screenshot. Try a clearer screenshot, or paste the stats text / type the numbers in.'; return; }
        found.forEach(([k, v]) => { const el = $(k); if (el) el.value = v; });
        $('groqResult').textContent = `AI read ${found.length} stat(s) (${modelUsed}): ${found.map(([k, v]) => k + ' ' + v).join(', ')}. Check them in the form, then press Save today.`;
        renderInsights(readLog());
      } catch (e) {
        $('groqResult').textContent = (e && e.message) || 'Screenshot reading failed. No numbers were taken from the screenshot. Try paste-as-text or manual entry instead.';
      }
    };
    reader.onerror = () => { $('groqResult').textContent = 'Could not read that image file. Try another screenshot, or paste the stats text instead.'; };
    reader.readAsDataURL(file);
  };
  $('mealPhoto').onchange = () => previewImage($('mealPhoto'), $('mealPhotoPreview'));

  $('goalsForm').onsubmit = e => {
    e.preventDefault();
    const goals = { calories: +$('goalCalories').value, protein: +$('goalProtein').value, carbs: +$('goalCarbs').value, fat: +$('goalFat').value };
    store.set('ft_goals', goals);
    if (backendOn && typeof FitnessApi !== 'undefined') FitnessApi.saveGoals(goals);
    renderMeals(); status('Targets saved.');
  };
  $('mealForm').onsubmit = e => {
    e.preventDefault();
    const m = { name: $('mealName').value, calories: +$('mealCalories').value || 0, protein: +$('mealProtein').value || 0, carbs: +$('mealCarbs').value || 0, fat: +$('mealFat').value || 0 };
    const all = store.get('ft_meals', {}); (all[dateVal()] = all[dateVal()] || []).push(m); store.set('ft_meals', all);
    if (backendOn && typeof FitnessApi !== 'undefined') {
      FitnessApi.addMeal({ ...m, date: dateVal() }).then(saved => {
        if (saved && saved.id) { m.id = saved.id; store.set('ft_meals', all); }
      });
    }
    renderMeals(); status('Meal added.');
  };
  $('saveMealFav').onclick = () => {
    const favs = store.get('ft_meal_favs', []);
    favs.push({ name: $('mealName').value, calories: +$('mealCalories').value || 0, protein: +$('mealProtein').value || 0, carbs: +$('mealCarbs').value || 0, fat: +$('mealFat').value || 0 });
    store.set('ft_meal_favs', favs); renderMeals(); status('Favourite meal saved.');
  };
  $('addFavWorkout').onclick = () => {
    const v = $('favWorkoutName').value.trim(); if (!v) return;
    const favs = store.get('ft_workout_favs', []); favs.push(v); store.set('ft_workout_favs', favs); renderMeals(); status('Favourite workout saved.');
  };
  $('csvFile').onchange = () => {
    const file = $('csvFile').files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = FitnessLogic.parseCsv(reader.result);
      const all = logs(); rows.forEach(r => { if (r.date) all[r.date] = r; }); store.set('ft_logs', all);
      if (backendOn && typeof FitnessApi !== 'undefined') rows.forEach(r => { if (r.date) FitnessApi.saveLog(r.date, r); });
      $('csvResult').textContent = `Imported ${rows.length} day(s) from CSV.`;
      loadLog();
    };
    reader.readAsText(file);
  };

  refreshGroqStatus();
  loadLog();
  // If the backend is up, sync logs, meals and goals from it, then re-render.
  syncFromBackend().then(() => loadLog());
})();
