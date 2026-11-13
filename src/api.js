// api.js — optional backend client for the Recovery & Performance Tracker.
// Tries the Spring Boot backend at http://localhost:8080 first.
// If the backend is not running (or a request fails), every call returns
// null / false and the app falls back to localStorage — the app must still
// work fully with no backend running. No data is ever lost by a failed call:
// callers only replace local data after a successful backend response.
// Pure functions + fetch, testable in Node with a mock fetch.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FitnessApi = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const BASE = 'http://localhost:8080';

  function fetchFn() {
    return (typeof fetch !== 'undefined') ? fetch : null;
  }

  async function health() {
    const f = fetchFn();
    if (!f) return false;
    try {
      const res = await f(BASE + '/api/health');
      if (!res.ok) return false;
      const data = await res.json();
      return data && data.status === 'ok';
    } catch { return false; }
  }

  // Returns the log object for a date, null on 404 / backend down.
  async function getLog(date) {
    const f = fetchFn();
    if (!f) return null;
    try {
      const res = await f(BASE + '/api/logs/' + encodeURIComponent(date));
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  // Returns all logs as a {date: log} map, or null if the backend is down.
  async function getAllLogs() {
    const f = fetchFn();
    if (!f) return null;
    try {
      const res = await f(BASE + '/api/logs');
      if (!res.ok) return null;
      const list = await res.json();
      const out = {};
      (list || []).forEach(l => { if (l && l.date) out[l.date] = l; });
      return out;
    } catch { return null; }
  }

  // Save (create or replace) one day's log. Returns true on success, false otherwise.
  async function saveLog(date, log) {
    const f = fetchFn();
    if (!f) return false;
    try {
      const res = await f(BASE + '/api/logs/' + encodeURIComponent(date), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...log, date }),
      });
      return res.ok;
    } catch { return false; }
  }

  // Delete one day's log. Returns true on success, false otherwise.
  async function deleteLog(date) {
    const f = fetchFn();
    if (!f) return false;
    try {
      const res = await f(BASE + '/api/logs/' + encodeURIComponent(date), { method: 'DELETE' });
      return res.ok;
    } catch { return false; }
  }

  return { BASE, health, getLog, getAllLogs, saveLog, deleteLog };
});
