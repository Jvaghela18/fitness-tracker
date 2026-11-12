// app.js — UI glue over src/parser.js + src/logic.js. Data in localStorage only.
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
      const all = store.get('ft_meals', {}); all[dateVal()].splice(+b.dataset.delMeal, 1); store.set('ft_meals', all); renderMeals();
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
    renderInsights(all[dateVal()]); status('Saved.');
  };
  $('deleteLog').onclick = () => { const all = logs(); delete all[dateVal()]; store.set('ft_logs', all); loadLog(); status('Deleted.'); };
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
  $('mealPhoto').onchange = () => previewImage($('mealPhoto'), $('mealPhotoPreview'));

  $('goalsForm').onsubmit = e => {
    e.preventDefault();
    store.set('ft_goals', { calories: +$('goalCalories').value, protein: +$('goalProtein').value, carbs: +$('goalCarbs').value, fat: +$('goalFat').value });
    renderMeals(); status('Targets saved.');
  };
  $('mealForm').onsubmit = e => {
    e.preventDefault();
    const m = { name: $('mealName').value, calories: +$('mealCalories').value || 0, protein: +$('mealProtein').value || 0, carbs: +$('mealCarbs').value || 0, fat: +$('mealFat').value || 0 };
    const all = store.get('ft_meals', {}); (all[dateVal()] = all[dateVal()] || []).push(m); store.set('ft_meals', all);
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
      $('csvResult').textContent = `Imported ${rows.length} day(s) from CSV.`;
      loadLog();
    };
    reader.readAsText(file);
  };

  loadLog();
})();
