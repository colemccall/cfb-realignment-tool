/**
 * app.js — Conference Realignment Simulator
 */

import { renderVoronoi } from './voronoi.js';
import { getPresets }    from './presets.js';

// ─── STATE ───────────────────────────────────────────────────────────────────

let ALL_TEAMS       = [];
let ALL_CONFERENCES = [];
let ESPN_IDS        = {};

const state = {
  conferences: {},
  analytics: { travel: {}, tv_markets: {}, balance: {}, strength: {}, state_coverage: {}, footprint: {} },
};
let baselineState = null;
const history = { past: [], future: [] };
const MAX_HISTORY = 50;
let leafletMap        = null;
let activeTab         = 'conferences';
let draggedTeamId     = null;
let dragSourceConfId  = null;
let selectedDotTeamId = null;  // for school card panel

// Timeline snap points: year → preset id
const TIMELINE_SNAPS = [
  { year: 1992, id: 'big-8-swc-1992',   label: 'Big 8 + SWC Era' },
  { year: 2003, id: 'big-east-era-2003', label: 'Big East Era' },
  { year: 2014, id: 'modern-era-2014',   label: 'Modern Era' },
  { year: 2024, id: 'chaos-2024',        label: 'Fall of the Pac-12' },
  { year: 2026, id: 'new-pac-12-2026',   label: 'New Pac-12' },
];

// ─── BOOT ────────────────────────────────────────────────────────────────────

async function init() {
  const [teamsRes, confsRes, espnRes] = await Promise.all([
    fetch('./data/teams.json'),
    fetch('./data/conferences.json'),
    fetch('./data/espn_ids.json'),
  ]);
  ALL_TEAMS       = await teamsRes.json();
  ALL_CONFERENCES = await confsRes.json();
  ESPN_IDS        = await espnRes.json();

  window.__appConferences = ALL_CONFERENCES;
  window.__allTeams       = ALL_TEAMS;

  const defaultConf = {};
  ALL_CONFERENCES.forEach(c => (defaultConf[c.id] = []));
  ALL_TEAMS.forEach(t => {
    if (defaultConf[t.conference] !== undefined) defaultConf[t.conference].push(t.id);
  });

  const fromHash = parseHash();
  state.conferences = fromHash || deepClone(defaultConf);
  baselineState = deepClone(state.conferences);

  recomputeAnalytics();
  renderHeader();
  renderAnalyticsPanel();
  renderMain();

  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', (e) => {
    const dd  = document.getElementById('presets-dropdown');
    const btn = document.getElementById('btn-presets');
    if (dd && !dd.contains(e.target) && e.target !== btn) dd.classList.remove('open');
    const sd  = document.getElementById('scenarios-dropdown');
    const sbtn = document.getElementById('btn-scenarios');
    if (sd && !sd.contains(e.target) && e.target !== sbtn) sd.classList.remove('open');
    // Close mobile analytics panel when tapping main content
    const sidebar = document.getElementById('analytics-sidebar');
    const toggleBtn = document.getElementById('btn-analytics-toggle');
    if (sidebar?.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) && e.target !== toggleBtn) {
      sidebar.classList.remove('mobile-open');
    }
  });
  // School card dismiss on map background click
  document.addEventListener('teamDotClick', (e) => showSchoolCard(e.detail));
  document.addEventListener('mapBackgroundClick', () => hideSchoolCard());
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ─── MOBILE-SAFE MODALS ──────────────────────────────────────────────────────
// Replaces window.prompt / confirm / alert which are blocked in some mobile contexts.

function showModal({ title = '', message = '', input = false, inputDefault = '', inputPlaceholder = '',
                     confirmLabel = 'OK', cancelLabel = null, danger = false }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100000;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    const box = document.createElement('div');
    box.style.cssText = `
      background:#fff;border-radius:12px;padding:20px 24px;max-width:360px;width:100%;
      box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:var(--font-body);
    `;
    box.innerHTML = `
      ${title ? `<div style="font-weight:700;font-size:16px;margin-bottom:8px">${title}</div>` : ''}
      ${message ? `<div style="font-size:14px;color:#444;margin-bottom:12px">${message}</div>` : ''}
      ${input ? `<input id="_modal_input" type="text" value="${inputDefault}"
        placeholder="${inputPlaceholder}"
        style="width:100%;padding:8px 10px;border:1.5px solid #ccc;border-radius:6px;
               font-size:14px;box-sizing:border-box;margin-bottom:14px;outline:none;" />` : ''}
      <div style="display:flex;gap:8px;justify-content:flex-end">
        ${cancelLabel ? `<button id="_modal_cancel" style="padding:7px 16px;border-radius:6px;
          border:1.5px solid #ccc;background:#fff;font-size:14px;cursor:pointer">${cancelLabel}</button>` : ''}
        <button id="_modal_ok" style="padding:7px 16px;border-radius:6px;border:none;
          background:${danger ? '#dc2626' : 'var(--accent, #2d9cdb)'};color:#fff;
          font-size:14px;font-weight:600;cursor:pointer">${confirmLabel}</button>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const inp = box.querySelector('#_modal_input');
    if (inp) { inp.focus(); inp.select(); }

    const finish = (val) => { overlay.remove(); resolve(val); };

    box.querySelector('#_modal_ok').addEventListener('click', () => {
      finish(input ? (inp?.value ?? '') : true);
    });
    box.querySelector('#_modal_cancel')?.addEventListener('click', () => finish(null));
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(null); });
    box.addEventListener('keydown', e => {
      if (e.key === 'Enter') finish(input ? (inp?.value ?? '') : true);
      if (e.key === 'Escape') finish(null);
    });
  });
}

function mAlert(msg)               { return showModal({ message: msg, confirmLabel: 'OK' }); }
function mConfirm(msg, danger)     { return showModal({ message: msg, confirmLabel: 'Yes', cancelLabel: 'Cancel', danger }); }
function mPrompt(msg, def = '', ph = '') {
  return showModal({ message: msg, input: true, inputDefault: def, inputPlaceholder: ph,
                     confirmLabel: 'OK', cancelLabel: 'Cancel' });
}

function logoUrl(teamId) {
  const id = ESPN_IDS[teamId];
  return id ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png` : null;
}

function confColor(confId) {
  const c = ALL_CONFERENCES.find(c => c.id === confId);
  return c ? c.color : hashColor(confId);
}

function confDisplayName(confId) {
  const c = ALL_CONFERENCES.find(c => c.id === confId);
  return c ? c.full_name : confId;
}

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${((h >>> 0) % 360)}, 55%, 40%)`;
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
  return String(n);
}

// ─── URL HASH ────────────────────────────────────────────────────────────────

function encodeHash(conferences) {
  const parts = Object.entries(conferences)
    .filter(([, teams]) => teams.length > 0)
    .map(([cid, teams]) => `${cid}=${teams.join(',')}`)
    .join('|');
  return '#v1:' + parts;
}

function parseHash() {
  const raw = window.location.hash;
  if (!raw || !raw.startsWith('#v1:')) return null;
  try {
    const conf = {};
    ALL_CONFERENCES.forEach(c => (conf[c.id] = []));
    raw.slice(4).split('|').forEach(seg => {
      const eq = seg.indexOf('=');
      if (eq === -1) return;
      const cid   = seg.slice(0, eq);
      const teams = seg.slice(eq + 1).split(',').filter(Boolean);
      conf[cid] = teams;
    });
    return conf;
  } catch { return null; }
}

let _hashTimer = null;
function scheduleHashUpdate() {
  clearTimeout(_hashTimer);
  _hashTimer = setTimeout(() => { window.location.hash = encodeHash(state.conferences); }, 500);
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function avgPairwiseDist(teamIds) {
  const teams = teamIds.map(id => ALL_TEAMS.find(t => t.id === id)).filter(Boolean);
  if (teams.length < 2) return 0;
  let total = 0, count = 0;
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++) {
      total += haversine(teams[i].lat, teams[i].lng, teams[j].lat, teams[j].lng);
      count++;
    }
  return count ? Math.round(total / count) : 0;
}

function computeStrengthScores(conferences) {
  const teamMap = {};
  ALL_TEAMS.forEach(t => (teamMap[t.id] = t));

  // Normalization bounds (across entire dataset)
  const allAttendance = ALL_TEAMS.map(t => t.avg_attendance || 0);
  const maxAttendance = Math.max(...allAttendance) || 1;
  const allEnrollment = ALL_TEAMS.map(t => t.enrollment || 0);
  const maxEnrollment = Math.max(...allEnrollment) || 1;
  // DMA rank: lower = bigger market; best = 1, worst ~200
  const MAX_DMA = 200;

  const scores = {};
  Object.entries(conferences).forEach(([cid, ids]) => {
    if (ids.length === 0) return;
    const teams = ids.map(id => teamMap[id]).filter(Boolean);
    if (!teams.length) return;

    // Attendance score (0–40)
    const avgAtt = teams.reduce((s, t) => s + (t.avg_attendance || 0), 0) / teams.length;
    const attScore = (avgAtt / maxAttendance) * 40;

    // TV market score (0–30): inverse of avg DMA rank
    const avgDMA = teams.reduce((s, t) => s + (t.tv_market_size || MAX_DMA), 0) / teams.length;
    const tvScore = ((MAX_DMA - avgDMA) / MAX_DMA) * 30;

    // Enrollment score (0–15)
    const avgEnr = teams.reduce((s, t) => s + (t.enrollment || 0), 0) / teams.length;
    const enrScore = (avgEnr / maxEnrollment) * 15;

    // Balance bonus (0–15): reward 8–16 teams
    const count = teams.length;
    const balScore = count >= 8 && count <= 16 ? 15 : count >= 6 ? 8 : 3;

    scores[cid] = Math.round(attScore + tvScore + enrScore + balScore);
  });
  return scores;
}

function bboxAreaMiles(teams) {
  if (teams.length < 2) return 0;
  const lats = teams.map(t => t.lat), lngs = teams.map(t => t.lng);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  return Math.round(latSpan * 69 * lngSpan * 69 * Math.cos(midLat * Math.PI / 180));
}

function computeCommissionerScore() {
  const { travel, balance, state_coverage } = state.analytics;
  const travelScore = Math.max(0, Math.round(((2000 - travel._overall) / 1200) * 30));
  const counts = Object.values(balance.counts).filter(n => n > 0);
  const outliers = counts.filter(n => n < 8 || n > 16).length;
  const balScore = Math.max(0, 30 - outliers * 8);
  const coveredMarkets = new Set(
    Object.values(state.conferences).flat()
      .map(id => ALL_TEAMS.find(t => t.id === id))
      .filter(t => t && (t.tv_market_size || 999) <= 25)
      .map(t => t.tv_market)
  ).size;
  const mktScore = Math.min(20, Math.round((coveredMarkets / 15) * 20));
  const stateScore = Math.min(20, Math.round(((state_coverage._total || 0) / 35) * 20));
  return Math.min(100, travelScore + balScore + mktScore + stateScore);
}

function recomputeAnalytics() {
  const confs = state.conferences;
  const travel = {};
  let totalAvg = 0, confCount = 0;
  Object.entries(confs).forEach(([cid, ids]) => {
    const d = avgPairwiseDist(ids);
    travel[cid] = d;
    if (ids.length >= 2) { totalAvg += d; confCount++; }
  });
  travel._overall = confCount ? Math.round(totalAvg / confCount) : 0;

  const tv_markets = {};
  Object.entries(confs).forEach(([cid, ids]) => {
    const teams = ids.map(id => ALL_TEAMS.find(t => t.id === id)).filter(Boolean);
    const ranked = [...new Set(teams.map(t => t.tv_market))]
      .map(m => ({ market: m, size: (teams.find(t => t.tv_market === m) || {}).tv_market_size || 999 }))
      .sort((a, b) => a.size - b.size);
    tv_markets[cid] = ranked.slice(0, 5).map(r => r.market);
  });

  const nonEmptyCounts = Object.values(confs).map(ids => ids.length).filter(n => n > 0);
  const balance = {
    counts: Object.fromEntries(Object.entries(confs).map(([cid, ids]) => [cid, ids.length])),
    avg: nonEmptyCounts.length ? Math.round(nonEmptyCounts.reduce((a, b) => a + b, 0) / nonEmptyCounts.length) : 0,
    min: nonEmptyCounts.length ? Math.min(...nonEmptyCounts) : 0,
    max: nonEmptyCounts.length ? Math.max(...nonEmptyCounts) : 0,
  };

  const strength = computeStrengthScores(confs);

  // State coverage per conference + total
  const state_coverage = {};
  Object.entries(confs).forEach(([cid, ids]) => {
    const teams = ids.map(id => ALL_TEAMS.find(t => t.id === id)).filter(Boolean);
    state_coverage[cid] = new Set(teams.map(t => t.state)).size;
  });
  state_coverage._total = new Set(
    Object.values(confs).flat()
      .map(id => ALL_TEAMS.find(t => t.id === id))
      .filter(Boolean).map(t => t.state)
  ).size;

  // Geographic footprint (bounding box area in sq miles) per conference
  const footprint = {};
  Object.entries(confs).forEach(([cid, ids]) => {
    const teams = ids.map(id => ALL_TEAMS.find(t => t.id === id)).filter(Boolean);
    footprint[cid] = bboxAreaMiles(teams);
  });

  state.analytics = { travel, tv_markets, balance, strength, state_coverage, footprint };
}

let _analyticsTimer = null;
function scheduleAnalytics() {
  clearTimeout(_analyticsTimer);
  _analyticsTimer = setTimeout(() => {
    recomputeAnalytics();
    renderAnalyticsPanel();
    if (activeTab === 'map' && leafletMap) renderMap();
  }, 100);
}

// ─── DELTA HELPERS ───────────────────────────────────────────────────────────

function deltaClass(cur, base, lowerIsBetter = false) {
  if (cur === base) return 'flat';
  if (lowerIsBetter) return cur < base ? 'up' : 'down';
  return cur > base ? 'up' : 'down';
}
function deltaSymbol(cur, base) {
  if (cur === base) return '—';
  const diff = cur - base;
  return `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}`;
}

// ─── RENDER: HEADER ──────────────────────────────────────────────────────────

function renderHeader() {
  const hdr = document.getElementById('app-header');
  if (!hdr) return;
  hdr.innerHTML = `
    <div class="bs-header app-realignment">
      <div class="bs-header-top">
        <div>
          <div class="bs-logo">Realignment Simulator</div>
          <div class="bs-logo-sub">Drag teams. Redraw the map. Break the internet.</div>
        </div>
        <div class="header-actions">
          <button class="btn-action" id="btn-analytics-toggle" title="Analytics">📊 Stats</button>
          <button class="btn-action" id="btn-undo" title="Undo (Ctrl+Z)">↩ Undo</button>
          <button class="btn-action" id="btn-reset">Reset</button>
          <button class="btn-action" id="btn-random" title="Random Realignment">🎲 Random</button>
          <div class="scenarios-wrap">
            <button class="btn-action btn-action--primary" id="btn-scenarios">💾 Scenarios ▾</button>
            <div class="scenarios-dropdown" id="scenarios-dropdown"></div>
          </div>
          <div class="presets-wrap">
            <button class="btn-action btn-action--primary" id="btn-presets">Presets ▾</button>
            <div class="presets-dropdown" id="presets-dropdown"></div>
          </div>
          <button class="btn-action btn-action--primary" id="btn-export">📸 Export</button>
        </div>
      </div>
      <div class="timeline-wrap" id="timeline-wrap">
        <span class="timeline-label" id="timeline-label">Era: <span>Current 2026</span></span>
        <input type="range" class="timeline-slider" id="timeline-slider"
               min="1985" max="2026" value="2026" step="1" />
      </div>
      <div id="ad-header" class="ad-placeholder ad-leaderboard"><span>Advertisement · 728×90</span></div>
      <div class="bs-tabs">
        <button class="bs-tab ${activeTab === 'conferences' ? 'active' : ''}" data-tab="conferences">Conferences</button>
        <button class="bs-tab ${activeTab === 'map' ? 'active' : ''}" data-tab="map">Map</button>
      </div>
    </div>
  `;
  document.getElementById('btn-reset').addEventListener('click', handleReset);
  document.getElementById('btn-random').addEventListener('click', randomRealignment);
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-analytics-toggle')?.addEventListener('click', () => {
    document.getElementById('analytics-sidebar')?.classList.toggle('mobile-open');
  });
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('btn-presets').addEventListener('click', () => {
    document.getElementById('presets-dropdown')?.classList.toggle('open');
    document.getElementById('scenarios-dropdown')?.classList.remove('open');
  });
  document.getElementById('btn-scenarios').addEventListener('click', () => {
    renderScenariosDropdown();
    document.getElementById('scenarios-dropdown')?.classList.toggle('open');
    document.getElementById('presets-dropdown')?.classList.remove('open');
  });
  document.querySelectorAll('.bs-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  renderPresetsDropdown();
  bindTimelineScrubber();
}

function renderPresetsDropdown() {
  const dd = document.getElementById('presets-dropdown');
  if (!dd) return;
  const presets = getPresets(ALL_TEAMS, ALL_CONFERENCES);
  dd.innerHTML = presets.map(p => `
    <button class="preset-item" data-preset="${p.id}">
      <span class="preset-name">${p.name}</span>
      <span class="preset-desc">${p.description}</span>
    </button>
  `).join('');
  dd.querySelectorAll('.preset-item').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });
}

// ─── TIMELINE SCRUBBER ───────────────────────────────────────────────────────

let _timelineTimer = null;

function bindTimelineScrubber() {
  const slider = document.getElementById('timeline-slider');
  if (!slider) return;
  slider.addEventListener('input', () => {
    const year = parseInt(slider.value, 10);
    updateTimelineLabel(year);
    clearTimeout(_timelineTimer);
    _timelineTimer = setTimeout(() => {
      const snap = getNearestSnap(year);
      if (snap) applyPreset(snap.id, false); // false = don't update slider
    }, 220);
  });
}

function getNearestSnap(year) {
  return TIMELINE_SNAPS.reduce((best, snap) => {
    return Math.abs(snap.year - year) < Math.abs(best.year - year) ? snap : best;
  }, TIMELINE_SNAPS[0]);
}

function updateTimelineLabel(year) {
  const snap = getNearestSnap(year);
  const lbl = document.getElementById('timeline-label');
  if (lbl) lbl.innerHTML = `Era: <span>${snap ? snap.label : year}</span>`;
}

function setTimelineToPreset(presetId) {
  const snap = TIMELINE_SNAPS.find(s => s.id === presetId);
  const slider = document.getElementById('timeline-slider');
  if (slider && snap) {
    slider.value = snap.year;
    updateTimelineLabel(snap.year);
  }
}

// ─── SCENARIOS (localStorage) ────────────────────────────────────────────────

const SCENARIOS_KEY = 'cfb_scenarios';

function loadScenarios() {
  try { return JSON.parse(localStorage.getItem(SCENARIOS_KEY) || '[]'); }
  catch { return []; }
}

function saveScenarios(arr) {
  localStorage.setItem(SCENARIOS_KEY, JSON.stringify(arr));
}

function saveScenario(name) {
  const hash = encodeHash(state.conferences);
  const scenarios = loadScenarios();
  scenarios.unshift({ name, timestamp: Date.now(), hash });
  if (scenarios.length > 20) scenarios.length = 20;
  saveScenarios(scenarios);
}

function deleteScenario(index) {
  const scenarios = loadScenarios();
  scenarios.splice(index, 1);
  saveScenarios(scenarios);
}

function renderScenariosDropdown() {
  const dd = document.getElementById('scenarios-dropdown');
  if (!dd) return;
  const scenarios = loadScenarios();
  const listHtml = scenarios.length === 0
    ? `<div class="scenarios-empty">No saved scenarios yet.</div>`
    : scenarios.map((s, i) => `
        <div class="scenario-item">
          <div class="scenario-info">
            <span class="scenario-name">${escapeHtml(s.name)}</span>
            <span class="scenario-date">${new Date(s.timestamp).toLocaleDateString()}</span>
          </div>
          <button class="btn-scenario-delete" data-index="${i}" title="Delete">×</button>
        </div>
      `).join('');
  dd.innerHTML = `
    ${listHtml}
    <div class="scenarios-save-row">
      <button class="btn-save-scenario" id="btn-save-now">Save Current Scenario</button>
    </div>
  `;
  dd.querySelectorAll('.scenario-item').forEach((row, i) => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-scenario-delete')) return;
      const s = loadScenarios()[i];
      if (!s) return;
      loadScenarioHash(s.hash);
      dd.classList.remove('open');
    });
  });
  dd.querySelectorAll('.btn-scenario-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteScenario(parseInt(btn.dataset.index, 10));
      renderScenariosDropdown();
    });
  });
  document.getElementById('btn-save-now')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const name = await mPrompt('Name this scenario:', 'My Realignment', 'e.g. Super SEC');
    if (!name?.trim()) return;
    saveScenario(name.trim());
    showToast(`Saved "${name.trim()}"`);
    renderScenariosDropdown();
  });
}

function loadScenarioHash(hash) {
  window.location.hash = hash;
  const parsed = parseHash();
  if (!parsed) return;
  pushHistory();
  state.conferences = parsed;
  recomputeAnalytics(); renderAnalyticsPanel(); renderMain(); scheduleHashUpdate();
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── RENDER: ANALYTICS PANEL ─────────────────────────────────────────────────

function renderAnalyticsPanel() {
  const panel = document.getElementById('analytics-panel');
  if (!panel) return;
  const { travel, tv_markets, balance, strength, state_coverage, footprint } = state.analytics;

  let travelBase = null, coverageBase = null;
  if (baselineState) {
    let bTotal = 0, bCount = 0;
    Object.entries(baselineState).forEach(([, ids]) => {
      const d = avgPairwiseDist(ids);
      if (ids.length >= 2) { bTotal += d; bCount++; }
    });
    travelBase = bCount ? Math.round(bTotal / bCount) : 0;
    coverageBase = new Set(
      Object.values(baselineState).flat()
        .map(id => ALL_TEAMS.find(t => t.id === id))
        .filter(Boolean).map(t => t.state)
    ).size;
  }

  const tDeltaCls  = travelBase   !== null ? deltaClass(travel._overall, travelBase, true) : 'flat';
  const tDeltaTxt  = travelBase   !== null ? deltaSymbol(travel._overall, travelBase) : '—';
  const covDeltaCls = coverageBase !== null ? deltaClass(state_coverage._total, coverageBase, false) : 'flat';
  const covDeltaTxt = coverageBase !== null ? deltaSymbol(state_coverage._total, coverageBase) : '—';

  const csScore = computeCommissionerScore();
  const csGrade = csScore >= 85 ? 'A' : csScore >= 70 ? 'B' : csScore >= 55 ? 'C' : csScore >= 40 ? 'D' : 'F';

  // Non-empty conferences (exclude FCS for analytics display)
  const nonEmpty = ALL_CONFERENCES.filter(c => c.id !== 'fcs' && (balance.counts[c.id] || 0) > 0);

  const balanceRows = nonEmpty.map(c => {
    const count = balance.counts[c.id] || 0;
    const warn  = count < 8 || count > 20;
    return `<div class="balance-row ${warn ? 'balance-warn' : ''}">
      <span class="balance-conf" style="color:${c.color}">${c.name}</span>
      <span class="balance-count">${count} teams ${warn ? '⚠' : ''}</span>
    </div>`;
  }).join('');

  const topMarkets = [...new Set(Object.values(tv_markets).flat())].slice(0, 5).join(', ') || '—';

  // Strength scores sorted descending
  const maxStrength = Math.max(...Object.values(strength), 1);
  const strengthRows = nonEmpty
    .filter(c => (strength[c.id] || 0) > 0)
    .sort((a, b) => (strength[b.id] || 0) - (strength[a.id] || 0))
    .map(c => {
      const score = strength[c.id] || 0;
      const pct   = Math.round((score / maxStrength) * 100);
      return `<div class="strength-row">
        <span class="strength-conf" style="color:${c.color}">${c.name}</span>
        <div class="strength-bar-wrap">
          <div class="strength-bar-fill" style="width:${pct}%;background:${c.color}"></div>
        </div>
        <span class="strength-score">${score}</span>
      </div>`;
    }).join('');

  panel.innerHTML = `
    <div class="commissioner-score-banner">
      <div>
        <div class="cs-label">Commissioner Score</div>
        <div class="cs-number">${csScore}<span style="font-size:14px;opacity:0.6">/100</span></div>
        <div class="cs-label" style="margin-top:2px">Travel · Balance · Markets · Geography</div>
      </div>
      <div class="cs-grade">${csGrade}</div>
    </div>
    <div class="analytics-header">
      <span class="bs-display-sm">Analytics</span>
    </div>
    <div class="bs-analytics-grid">
      <div class="bs-analytic">
        <div class="bs-analytic-label">Avg Travel</div>
        <div class="bs-analytic-value">${travel._overall.toLocaleString()}</div>
        <div class="bs-analytic-sub">miles / conf</div>
        <div class="bs-analytic-delta ${tDeltaCls}">${tDeltaTxt}</div>
      </div>
      <div class="bs-analytic">
        <div class="bs-analytic-label">States Covered</div>
        <div class="bs-analytic-value">${state_coverage._total}</div>
        <div class="bs-analytic-sub">across all confs</div>
        <div class="bs-analytic-delta ${covDeltaCls}">${covDeltaTxt}</div>
      </div>
      <div class="bs-analytic">
        <div class="bs-analytic-label">Balance</div>
        <div class="bs-analytic-value">${balance.avg}</div>
        <div class="bs-analytic-sub">avg teams</div>
        <div class="bs-analytic-delta flat">min ${balance.min} · max ${balance.max}</div>
      </div>
      <div class="bs-analytic">
        <div class="bs-analytic-label">Top Markets</div>
        <div class="bs-analytic-value" style="font-size:12px;line-height:1.3">${topMarkets}</div>
        <div class="bs-analytic-sub">by DMA rank</div>
        <div class="bs-analytic-delta flat">&nbsp;</div>
      </div>
    </div>
    <div class="analytics-section">
      <div class="analytics-section-title">Conference Strength</div>
      ${strengthRows || '<div style="font-size:11px;color:var(--text-muted)">—</div>'}
    </div>
    <div class="analytics-section">
      <div class="analytics-section-title">Conference Balance</div>
      ${balanceRows}
    </div>
    <div class="analytics-section">
      <div class="analytics-section-title">Travel Burden</div>
      ${nonEmpty.map(c => `
        <div class="travel-row">
          <span class="travel-conf" style="color:${c.color}">${c.name}</span>
          <span class="travel-val">${(travel[c.id] || 0).toLocaleString()} mi</span>
        </div>`).join('')}
    </div>
    <div class="analytics-section">
      <div class="analytics-section-title">Geographic Footprint</div>
      ${nonEmpty.map(c => {
        const sqmi = footprint[c.id] || 0;
        const label = sqmi >= 1000000 ? (sqmi/1000000).toFixed(1)+'M sq mi'
                    : sqmi >= 1000    ? Math.round(sqmi/1000)+'k sq mi'
                    : sqmi + ' sq mi';
        return `<div class="travel-row">
          <span class="travel-conf" style="color:${c.color}">${c.name}</span>
          <span class="travel-val">${label}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="analytics-section">
      <div class="analytics-section-title">Top TV Markets by Conf</div>
      ${nonEmpty.map(c => `
        <div class="market-row">
          <span class="market-conf" style="color:${c.color}">${c.name}</span>
          <span class="market-val">${(tv_markets[c.id] || []).join(', ') || '—'}</span>
        </div>`).join('')}
    </div>
    <div id="ad-sidebar" class="ad-placeholder ad-sidebar"><span>Advertisement · 300×250</span></div>
  `;
}

// ─── RENDER: MAIN (tab router) ───────────────────────────────────────────────

function renderMain() {
  const main = document.getElementById('main-content');
  if (!main) return;
  activeTab === 'conferences' ? renderConferencesTab(main) : renderMapTab(main);
}

// ─── RENDER: CONFERENCES TAB ─────────────────────────────────────────────────

function renderConferencesTab(container) {
  const teamMap = {};
  ALL_TEAMS.forEach(t => (teamMap[t.id] = t));

  const knownIds  = new Set(ALL_CONFERENCES.map(c => c.id));
  const customConfs = Object.keys(state.conferences)
    .filter(id => !knownIds.has(id))
    .map(id => ({ id, name: id, full_name: id, color: hashColor(id), tier: 2 }));

  // Non-FCS conferences with teams; FCS column always last
  const mainConfs = [...ALL_CONFERENCES, ...customConfs]
    .filter(conf => conf.id !== 'fcs' && (state.conferences[conf.id] || []).length > 0);

  const fcsConf = ALL_CONFERENCES.find(c => c.id === 'fcs');
  const fcsTeams = state.conferences['fcs'] || [];
  const showFcs = fcsTeams.length > 0 && fcsConf;

  container.innerHTML = `
    <div class="conf-board" id="conf-board">
      ${mainConfs.map(conf => renderConferenceColumn(conf, state.conferences[conf.id] || [], teamMap)).join('')}
      ${showFcs ? renderConferenceColumn(fcsConf, fcsTeams, teamMap, true) : ''}
      <div class="conf-column conf-column--add">
        <button class="btn-add-conf" id="btn-add-conf">+ New Conference</button>
      </div>
    </div>
  `;

  bindDragDrop();

  container.querySelectorAll('.btn-delete-col').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteConference(btn.dataset.conf));
  });
  container.querySelectorAll('.btn-rename-col').forEach(btn => {
    btn.addEventListener('click', () => handleRenameConference(btn.dataset.conf));
  });
  document.getElementById('btn-add-conf')?.addEventListener('click', handleAddConference);
}

function renderConferenceColumn(conf, teamIds, teamMap, isFcs = false) {
  const color = conf.color || hashColor(conf.id);
  const teams = teamIds.map(id => teamMap[id]).filter(Boolean);
  const extraClass = isFcs ? ' conf-column--fcs' : '';
  const displayName = isFcs ? 'FCS / Not Yet FBS' : (conf.full_name || conf.name);
  return `
    <div class="conf-column${extraClass}" data-conf-id="${conf.id}" id="col-${conf.id}">
      <div class="conf-col-header" style="border-top:3px solid ${color}">
        <div class="conf-col-title">
          <span class="conf-col-name">${displayName}</span>
          <span class="conf-col-badge">${teams.length}</span>
        </div>
        <div class="conf-col-actions">
          ${!isFcs ? `<button class="btn-rename-col" data-conf="${conf.id}" title="Rename">✏</button>` : ''}
          ${!isFcs ? `<button class="btn-delete-col" data-conf="${conf.id}" title="Remove">×</button>` : ''}
        </div>
      </div>
      <div class="conf-col-body droptarget" data-conf-id="${conf.id}">
        ${teams.map(team => renderTeamCard(team, conf.id, isFcs)).join('')}
      </div>
    </div>
  `;
}

function renderTeamCard(team, confId, isFcs = false) {
  const url = logoUrl(team.id);
  const logoHtml = url
    ? `<img class="team-logo" src="${url}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
    : '';
  const swatchStyle = url ? 'display:none' : '';
  const fcsBadge = isFcs ? `<span class="team-fcs-badge">FCS</span>` : '';
  return `
    <div class="team-card" draggable="true" data-team-id="${team.id}" data-conf-id="${confId}"
         title="${team.name} · ${team.city}, ${team.state}">
      <div class="team-logo-wrap">
        ${logoHtml}
        <div class="team-card-swatch" style="background:${team.primary_color};${swatchStyle}"></div>
      </div>
      <div class="team-card-body">
        <span class="team-card-name">${team.name}</span>
        <span class="team-card-meta">${team.city}, ${team.state}</span>
      </div>
      ${fcsBadge}
      <span class="team-card-short">${team.short}</span>
    </div>
  `;
}

// ─── DRAG AND DROP ───────────────────────────────────────────────────────────

function bindDragDrop() {
  document.querySelectorAll('.team-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend',   onDragEnd);
    card.addEventListener('touchstart', onTouchStart, { passive: false });
    card.addEventListener('touchmove',  onTouchMove,  { passive: false });
    card.addEventListener('touchend',   onTouchEnd,   { passive: false });
  });
  document.querySelectorAll('.droptarget').forEach(target => {
    target.addEventListener('dragover',  onDragOver);
    target.addEventListener('dragleave', onDragLeave);
    target.addEventListener('drop',      onDrop);
  });
}

function onDragStart(e) {
  draggedTeamId    = e.currentTarget.dataset.teamId;
  dragSourceConfId = e.currentTarget.dataset.confId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTeamId);
  e.currentTarget.classList.add('dragging');
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.droptarget').forEach(el => el.classList.remove('drag-over'));
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drag-over');
}
function onDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const targetConfId = e.currentTarget.dataset.confId;
  if (!draggedTeamId || !targetConfId || targetConfId === dragSourceConfId) return;
  moveTeam(draggedTeamId, dragSourceConfId, targetConfId);
  draggedTeamId = dragSourceConfId = null;
}

function moveTeam(teamId, fromConf, toConf) {
  if (!teamId || !toConf || toConf === fromConf) return;
  pushHistory();
  state.conferences[fromConf] = (state.conferences[fromConf] || []).filter(id => id !== teamId);
  if (!state.conferences[toConf]) state.conferences[toConf] = [];
  state.conferences[toConf].push(teamId);
  scheduleAnalytics();
  scheduleHashUpdate();
  renderMain();
}

// ─── TOUCH DRAG ──────────────────────────────────────────────────────────────

let _touchGhost    = null;
let _touchOffsetX  = 0;
let _touchOffsetY  = 0;
let _touchHoverCol = null;

function onTouchStart(e) {
  const card = e.currentTarget;
  draggedTeamId    = card.dataset.teamId;
  dragSourceConfId = card.dataset.confId;

  const touch  = e.touches[0];
  const rect   = card.getBoundingClientRect();
  _touchOffsetX = touch.clientX - rect.left;
  _touchOffsetY = touch.clientY - rect.top;

  // Build ghost
  _touchGhost = card.cloneNode(true);
  _touchGhost.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    opacity: 0.85;
    width: ${rect.width}px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    border-radius: 8px;
    left: ${touch.clientX - _touchOffsetX}px;
    top:  ${touch.clientY - _touchOffsetY}px;
    transform: scale(1.04);
    transition: none;
  `;
  document.body.appendChild(_touchGhost);
  card.classList.add('dragging');
  e.preventDefault();
}

function onTouchMove(e) {
  if (!_touchGhost) return;
  e.preventDefault();
  const touch = e.touches[0];

  _touchGhost.style.left = `${touch.clientX - _touchOffsetX}px`;
  _touchGhost.style.top  = `${touch.clientY - _touchOffsetY}px`;

  // Find droptarget under finger
  _touchGhost.style.display = 'none';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  _touchGhost.style.display = '';

  const dropTarget = el?.closest('.droptarget');

  if (_touchHoverCol && _touchHoverCol !== dropTarget) {
    _touchHoverCol.classList.remove('drag-over');
  }
  if (dropTarget) {
    dropTarget.classList.add('drag-over');
    _touchHoverCol = dropTarget;
  } else {
    _touchHoverCol = null;
  }
}

function onTouchEnd(e) {
  if (!_touchGhost) return;
  e.preventDefault();

  const touch = e.changedTouches[0];

  // Clean up ghost
  _touchGhost.remove();
  _touchGhost = null;
  document.querySelectorAll('.team-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.droptarget').forEach(el => el.classList.remove('drag-over'));

  // Find drop target
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const dropTarget = el?.closest('.droptarget');
  const targetConfId = dropTarget?.dataset.confId;

  if (targetConfId) {
    moveTeam(draggedTeamId, dragSourceConfId, targetConfId);
  }
  draggedTeamId = dragSourceConfId = null;
  _touchHoverCol = null;
}

// ─── CONFERENCE MANAGEMENT ───────────────────────────────────────────────────

async function handleAddConference() {
  const name = await mPrompt('New conference name:', '', 'e.g. Mega East');
  if (!name?.trim()) return;
  const id = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!id) return;
  if (state.conferences[id] !== undefined) {
    await mAlert(`"${id}" already exists.`); return;
  }
  pushHistory();
  state.conferences[id] = [];
  renderMain();
  scheduleHashUpdate();
}

async function handleDeleteConference(confId) {
  const teams = state.conferences[confId] || [];
  if (teams.length > 0) { await mAlert(`Move all ${teams.length} team(s) out first.`); return; }
  const ok = await mConfirm(`Remove "${confId}"?`, true);
  if (!ok) return;
  pushHistory();
  delete state.conferences[confId];
  renderMain();
  scheduleHashUpdate();
}

async function handleRenameConference(confId) {
  const current = confDisplayName(confId);
  const newName = await mPrompt(`Rename conference:`, current, current);
  if (!newName?.trim() || newName.trim() === current) return;
  const newId = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!newId) return;
  if (newId !== confId && state.conferences[newId] !== undefined) {
    await mAlert(`"${newId}" already exists.`); return;
  }
  if (newId === confId) return;
  pushHistory();
  if (!ALL_CONFERENCES.find(c => c.id === confId)) {
    state.conferences[newId] = state.conferences[confId];
    delete state.conferences[confId];
  } else {
    if (!state.renameOverrides) state.renameOverrides = {};
    state.renameOverrides[confId] = newName.trim();
  }
  renderMain();
  scheduleHashUpdate();
}

// ─── RENDER: MAP TAB ─────────────────────────────────────────────────────────

function renderMapTab(container) {
  container.innerHTML = `
    <div id="leaflet-map" style="width:100%;height:100%;min-height:500px"></div>
    <div id="school-card-panel"></div>
  `;
  requestAnimationFrame(() => initMap());
}

function initMap() {
  if (typeof L === 'undefined') { console.warn('Leaflet not loaded'); return; }
  const mapEl = document.getElementById('leaflet-map');
  if (!mapEl) return;
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  leafletMap = L.map('leaflet-map', { center: [38.5, -96.5], zoom: 4, zoomSnap: 0.5 });
  // Gray basemap — Carto Positron (free, no API key)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(leafletMap);
  renderMap();
}

function renderMap() {
  if (!leafletMap) return;
  const confColors = {};
  ALL_CONFERENCES.forEach(c => (confColors[c.id] = c.color));
  Object.keys(state.conferences).forEach(id => { if (!confColors[id]) confColors[id] = hashColor(id); });
  renderVoronoi(ALL_TEAMS, confColors, leafletMap, state);
}

// ─── SCHOOL CARD PANEL ───────────────────────────────────────────────────────

function showSchoolCard(team) {
  const panel = document.getElementById('school-card-panel');
  if (!panel) return;
  selectedDotTeamId = team.id;

  // Find current conference
  let currentConfId = null;
  Object.entries(state.conferences).forEach(([cid, ids]) => {
    if (ids.includes(team.id)) currentConfId = cid;
  });
  const conf = ALL_CONFERENCES.find(c => c.id === currentConfId);
  const color = conf ? conf.color : hashColor(currentConfId || '');
  const confName = conf ? conf.full_name : (currentConfId || 'Independent');

  const url = logoUrl(team.id);
  const logoHtml = url
    ? `<img class="sc-logo" src="${url}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="sc-logo-swatch" style="background:${team.primary_color};display:none"></div>`
    : `<div class="sc-logo-swatch" style="background:${team.primary_color}"></div>`;

  panel.innerHTML = `
    <div class="sc-header">
      ${logoHtml}
      <div class="sc-title">
        <div class="sc-name">${team.name}</div>
        <span class="sc-conf-badge" style="background:${color}">${confName}</span>
      </div>
      <button class="btn-sc-close" id="btn-sc-close">×</button>
    </div>
    <div class="sc-body">
      <div class="sc-stat-row">
        <span class="sc-stat-label">Location</span>
        <span class="sc-stat-value">${team.city}, ${team.state}</span>
      </div>
      <div class="sc-stat-row">
        <span class="sc-stat-label">Enrollment</span>
        <span class="sc-stat-value">${fmtNum(team.enrollment || 0)}</span>
      </div>
      <div class="sc-stat-row">
        <span class="sc-stat-label">Avg Attendance</span>
        <span class="sc-stat-value">${fmtNum(team.avg_attendance || 0)}</span>
      </div>
      <div class="sc-stat-row">
        <span class="sc-stat-label">TV Market</span>
        <span class="sc-stat-value">${team.tv_market} (#${team.tv_market_size})</span>
      </div>
      <div class="sc-colors">
        <div class="sc-color-chip" style="background:${team.primary_color}" title="Primary"></div>
        ${team.secondary_color ? `<div class="sc-color-chip" style="background:${team.secondary_color}" title="Secondary"></div>` : ''}
      </div>
    </div>
  `;

  panel.classList.add('visible');
  document.getElementById('btn-sc-close')?.addEventListener('click', hideSchoolCard);
}

function hideSchoolCard() {
  const panel = document.getElementById('school-card-panel');
  if (panel) panel.classList.remove('visible');
  selectedDotTeamId = null;
}

// ─── TAB SWITCHING ───────────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.bs-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  renderMain();
}

// ─── UNDO / REDO ─────────────────────────────────────────────────────────────

function pushHistory() {
  history.past.push(deepClone(state.conferences));
  if (history.past.length > MAX_HISTORY) history.past.shift();
  history.future = [];
}
function undo() {
  if (!history.past.length) return;
  history.future.push(deepClone(state.conferences));
  state.conferences = history.past.pop();
  afterHistoryChange();
}
function redo() {
  if (!history.future.length) return;
  history.past.push(deepClone(state.conferences));
  state.conferences = history.future.pop();
  afterHistoryChange();
}
function afterHistoryChange() {
  recomputeAnalytics(); renderAnalyticsPanel(); renderMain(); scheduleHashUpdate();
}

// ─── RESET ───────────────────────────────────────────────────────────────────

async function handleReset() {
  const ok = await mConfirm('Reset to default 2026 alignment? This clears undo history.', false);
  if (!ok) return;
  history.past = []; history.future = [];
  const defaultConf = {};
  ALL_CONFERENCES.forEach(c => (defaultConf[c.id] = []));
  ALL_TEAMS.forEach(t => { if (defaultConf[t.conference] !== undefined) defaultConf[t.conference].push(t.id); });
  state.conferences = deepClone(defaultConf);
  baselineState     = deepClone(defaultConf);
  recomputeAnalytics(); renderAnalyticsPanel(); renderMain(); scheduleHashUpdate();
  const slider = document.getElementById('timeline-slider');
  if (slider) { slider.value = 2026; updateTimelineLabel(2026); }
}

function randomRealignment() {
  pushHistory();
  const confIds = Object.keys(state.conferences).filter(cid => cid !== 'fcs');
  const fcsTeams = state.conferences['fcs'] || [];
  const pool = confIds.flatMap(cid => state.conferences[cid]);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const per = Math.floor(pool.length / confIds.length);
  confIds.forEach((cid, i) => { state.conferences[cid] = pool.slice(i * per, (i + 1) * per); });
  state.conferences[confIds.at(-1)].push(...pool.slice(confIds.length * per));
  if (fcsTeams.length) state.conferences['fcs'] = fcsTeams;
  scheduleAnalytics(); renderMain(); scheduleHashUpdate();
  showToast('🎲 Chaos achieved. Good luck explaining this to the fans.');
}

// ─── EXPORT: CANVAS INFOGRAPHIC ──────────────────────────────────────────────

async function handleExport() {
  const url = window.location.href.split('#')[0] + encodeHash(state.conferences);
  try { await navigator.clipboard.writeText(url); showToast('Share URL copied!'); }
  catch { await showModal({ title: 'Copy Share URL', input: true, inputDefault: url, confirmLabel: 'Done' }); }

  const canvas = generateExportCanvas();
  const a = document.createElement('a');
  a.download = 'cfb-realignment.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
  showToast('Image downloaded!');
}

function generateExportCanvas() {
  const W = 1200, PAD = 32;
  const HEADER_H = 90, FOOTER_H = 48, STATS_H = 64;
  const CONF_START_Y = HEADER_H + 16;

  const activeConfs = [...ALL_CONFERENCES, ...Object.keys(state.conferences)
    .filter(id => !ALL_CONFERENCES.find(c => c.id === id))
    .map(id => ({ id, name: id, full_name: id, color: hashColor(id) }))
  ].filter(c => c.id !== 'fcs' && (state.conferences[c.id] || []).length > 0);

  const teamMap = {};
  ALL_TEAMS.forEach(t => (teamMap[t.id] = t));

  const TEAM_ROW_H = 22, COL_HEADER_H = 46;
  const maxTeams = Math.max(...activeConfs.map(c => (state.conferences[c.id] || []).length), 1);
  const CONF_BLOCK_H = COL_HEADER_H + maxTeams * TEAM_ROW_H + 12;
  const H = HEADER_H + 16 + CONF_BLOCK_H + STATS_H + FOOTER_H + 16;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  const grad = ctx.createLinearGradient(0,0,W,0);
  grad.addColorStop(0,'#1e2a3a'); grad.addColorStop(0.5,'#1a3a5c'); grad.addColorStop(1,'#1e2a3a');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,HEADER_H);

  ctx.font = 'bold 36px "Barlow Condensed", Arial Narrow, Arial';
  ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText('🏈 CFB CONFERENCE REALIGNMENT SIMULATOR', PAD, HEADER_H*0.42);
  ctx.font = '16px "Inter", Arial'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`cfb-realignment.app  ·  ${activeConfs.length} conferences  ·  ${ALL_TEAMS.length} teams`, PAD, HEADER_H*0.75);

  const cols = activeConfs.length;
  const COL_W = Math.floor((W - PAD*2 - (cols-1)*8) / cols);
  let cx = PAD, cy = CONF_START_Y;

  activeConfs.forEach(conf => {
    const teams = (state.conferences[conf.id]||[]).map(id=>teamMap[id]).filter(Boolean);
    const color = conf.color || hashColor(conf.id);
    ctx.fillStyle='rgba(255,255,255,0.04)'; roundRect(ctx,cx,cy,COL_W,CONF_BLOCK_H,8); ctx.fill();
    ctx.fillStyle=color; roundRectTop(ctx,cx,cy,COL_W,4,8); ctx.fill();
    ctx.font=`bold ${Math.min(14,Math.floor(COL_W/8))}px "Barlow Condensed", Arial`;
    ctx.fillStyle='#FFFFFF'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(conf.name||conf.id.toUpperCase(), cx+10, cy+16);
    ctx.font='bold 11px "Inter", Arial'; ctx.fillStyle=color;
    ctx.fillText(`${teams.length}`, cx+COL_W-28, cy+16);
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx+8,cy+COL_HEADER_H-4); ctx.lineTo(cx+COL_W-8,cy+COL_HEADER_H-4); ctx.stroke();
    teams.forEach((team,i) => {
      const ty = cy+COL_HEADER_H+i*TEAM_ROW_H+TEAM_ROW_H/2;
      ctx.fillStyle=team.primary_color||color; ctx.fillRect(cx+8,ty-7,3,14);
      ctx.font=`${Math.min(11,Math.floor(COL_W/14))}px "Inter", Arial`;
      ctx.fillStyle='#E8E8E8'; ctx.textAlign='left'; ctx.textBaseline='middle';
      const maxW=COL_W-44; let name=team.name;
      while(ctx.measureText(name).width>maxW&&name.length>4) name=name.slice(0,-1);
      if(name!==team.name) name+='…';
      ctx.fillText(name, cx+16, ty);
    });
    cx += COL_W+8;
  });

  const statsY = cy+CONF_BLOCK_H+12;
  ctx.fillStyle='rgba(255,255,255,0.05)'; roundRect(ctx,PAD,statsY,W-PAD*2,STATS_H,8); ctx.fill();
  const { travel, balance, state_coverage } = state.analytics;
  const csExport = computeCommissionerScore();
  const stats = [
    { label:'Avg Travel', value:`${travel._overall.toLocaleString()} mi/conf` },
    { label:'States Covered', value:`${state_coverage._total} states` },
    { label:'Team Balance', value:`avg ${balance.avg} · min ${balance.min} · max ${balance.max}` },
    { label:'Commissioner Score', value:`${csExport}/100` },
  ];
  const statW=(W-PAD*2)/stats.length;
  stats.forEach((s,i) => {
    const sx=PAD+i*statW+statW/2, sy=statsY+STATS_H/2;
    ctx.font='bold 18px "Barlow Condensed", Arial'; ctx.fillStyle='#FFFFFF';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(s.value, sx, sy-8);
    ctx.font='11px "Inter", Arial'; ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.fillText(s.label.toUpperCase(), sx, sy+12);
  });

  const footerY=statsY+STATS_H+8;
  ctx.font='12px "Inter", Arial'; ctx.fillStyle='rgba(255,255,255,0.25)';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Made with cfb-realignment.app — github.com/colemccall/cfb-realignment-tool', W/2, footerY+FOOTER_H/2);
  return canvas;
}

function roundRect(ctx,x,y,w,h,r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function roundRectTop(ctx,x,y,w,h,r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ─── PRESETS ─────────────────────────────────────────────────────────────────

function applyPreset(presetId, updateSlider = true) {
  const preset = getPresets(ALL_TEAMS, ALL_CONFERENCES).find(p => p.id === presetId);
  if (!preset) return;
  pushHistory();
  const newConf = preset.getConferences();
  ALL_CONFERENCES.forEach(c => { if (!newConf[c.id]) newConf[c.id] = []; });
  state.conferences = newConf;
  document.getElementById('presets-dropdown')?.classList.remove('open');
  if (updateSlider) setTimelineToPreset(presetId);
  recomputeAnalytics(); renderAnalyticsPanel(); renderMain(); scheduleHashUpdate();
  showToast(`Loaded: ${preset.name}`);
}

// ─── KEYBOARD ────────────────────────────────────────────────────────────────

function handleKeydown(e) {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function showToast(msg, duration = 2500) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'bs-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── KICK OFF ────────────────────────────────────────────────────────────────

init().catch(console.error);
