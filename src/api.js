// api.js — backend client for the Recovery & Performance Tracker.
// The backend is part of the app, not a separate service: one run of the
// Spring Boot backend serves the frontend and the API together on port
// 8080, and the backend is the primary store for logs, meals and goals.
// Calls try same-origin /api first (the app served by the backend itself),
// then http://localhost:8080 (the app served another way, e.g. a second
// local server on port 8000). localStorage is only a last-resort offline
// fallback when no backend answers at all — it is not the normal mode.
// A real HTTP answer (even a 404) counts as the backend answering, so it
// is never retried on the other base; only a failed connection tries the
// next base. No data is ever lost by a failed call: callers only replace
// local data after a successful backend response.
// Pure functions + fetch, testable in Node with a mock fetch.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FitnessApi = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const BASES = ['', 'http://localhost:8080'];
  // Kept for callers that used it: the cross-origin base, used only when
  // same-origin does not answer.
  const BASE = 'http://localhost:8080';

  function fetchFn() {
    return (typeof fetch !== 'undefined') ? fetch : null;
  }

  // One request, trying each base in order. Returns the Response, or null
  // if no base could be reached at all.
  async function request(path, opts) {
    const f = fetchFn();
    if (!f) return null;
    for (const base of BASES) {
      try {
        return await f(base + path, opts);
      } catch {
        // Connection failed on this base — try the next one.
      }
    }
    return null;
  }

  async function health() {
    const res = await request('/api/health');
    if (!res || !res.ok) return false;
    const data = await res.json().catch(() => null);
    return data && data.status === 'ok';
  }

  // Returns the log object for a date, null on 404 / backend down.
  async function getLog(date) {
    const res = await request('/api/logs/' + encodeURIComponent(date));
    if (!res || !res.ok) return null;
    return await res.json();
  }

  // Returns all logs as a {date: log} map, or null if the backend is down.
  async function getAllLogs() {
    const res = await request('/api/logs');
    if (!res || !res.ok) return null;
    const list = await res.json();
    const out = {};
    (list || []).forEach(l => { if (l && l.date) out[l.date] = l; });
    return out;
  }

  // Save (create or replace) one day's log. Returns true on success, false otherwise.
  async function saveLog(date, log) {
    const res = await request('/api/logs/' + encodeURIComponent(date), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...log, date }),
    });
    return !!res && res.ok;
  }

  // Delete one day's log. Returns true on success, false otherwise.
  async function deleteLog(date) {
    const res = await request('/api/logs/' + encodeURIComponent(date), { method: 'DELETE' });
    return !!res && res.ok;
  }

  // Returns the meals for a date as a list, or null if the backend is down.
  async function getMeals(date) {
    const res = await request('/api/meals?date=' + encodeURIComponent(date));
    if (!res || !res.ok) return null;
    return await res.json();
  }

  // Returns all meals as a list, or null if the backend is down.
  async function getAllMeals() {
    const res = await request('/api/meals');
    if (!res || !res.ok) return null;
    return await res.json();
  }

  // Add one meal. Returns the saved meal (with its id) or null on failure.
  async function addMeal(meal) {
    const res = await request('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal),
    });
    if (!res || !res.ok) return null;
    return await res.json();
  }

  // Delete one meal by id. Returns true on success, false otherwise.
  async function deleteMeal(id) {
    const res = await request('/api/meals/' + encodeURIComponent(id), { method: 'DELETE' });
    return !!res && res.ok;
  }

  // Returns the macro goals object, or null if the backend is down.
  async function getGoals() {
    const res = await request('/api/goals');
    if (!res || !res.ok) return null;
    return await res.json();
  }

  // Replace the macro goals. Returns true on success, false otherwise.
  async function saveGoals(goals) {
    const res = await request('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goals),
    });
    return !!res && res.ok;
  }

  return { BASE, BASES, health, getLog, getAllLogs, saveLog, deleteLog,
    getMeals, getAllMeals, addMeal, deleteMeal, getGoals, saveGoals };
});
