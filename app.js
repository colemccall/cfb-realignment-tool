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
  analytics: { travel: {}, rivalries: {}, tv_markets: {}, balance: {} },
};
let baselineState = null;
const history = { past: [], future: [] };
const MAX_HISTORY = 50;
let leafletMap   = null;
let activeTab    = 'conferences';
let draggedTeamId    = null;
let dragSourceConfId = null;

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
  });
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

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

function countRivalriesPreserved(conferences) {
  const tc = {};
  Object.entries(conferences).forEach(([cid, ids]) => ids.forEach(id => (tc[id] = cid)));
  let preserved = 0;
  const counted = new Set();
  ALL_TEAMS.forEach(team => {
    (team.rivalries || []).forEach(rid => {
      const key = [team.id, rid].sort().join('|');
      if (!counted.has(key)) {
        counted.add(key);
        if (tc[team.id] && tc[rid] && tc[team.id] === tc[rid]) preserved++;
      }
    });
  });
  return preserved;
}

function countTotalRivalries() {
  const counted = new Set();
  ALL_TEAMS.forEach(team => {
    (team.rivalries || []).forEach(rid => counted.add([team.id, rid].sort().join('|')));
  });
  return counted.size;
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

  const preserved = countRivalriesPreserved(confs);
  const total     = countTotalRivalries();
  const rivalries = { preserved, total, pct: total ? Math.round((preserved / total) * 100) : 0 };

  const tv_markets = {};
  Object.entries(confs).forEach(([cid, ids]) => {
    const teams = ids.map(id => ALL_TEAMS.find(t => t.id === id)).filter(Boolean);
    const ranked = [...new Set(teams.map(t => t.tv_market))]
      .map(m => ({ market: m, size: (teams.find(t => t.tv_market === m) || {}).tv_market_size || 999 }))
      .sort((a, b) => a.size - b.size);
    tv_markets[cid] = ranked.slice(0, 5).map(r => r.market);
  });

  const counts  = Object.values(confs).map(ids => ids.length);
  const balance = {
    counts: Object.fromEntries(Object.entries(confs).map(([cid, ids]) => [cid, ids.length])),
    avg: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0,
    min: Math.min(...counts),
    max: Math.max(...counts),
  };

  state.analytics = { travel, rivalries, tv_markets, balance };
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
          <button class="btn-action" id="btn-undo" title="Undo (Ctrl+Z)">↩ Undo</button>
          <button class="btn-action" id="btn-reset">Reset</button>
          <div class="presets-wrap">
            <button class="btn-action btn-action--primary" id="btn-presets">Presets ▾</button>
            <div class="presets-dropdown" id="presets-dropdown"></div>
          </div>
          <button class="btn-action btn-action--primary" id="btn-export">📸 Export</button>
        </div>
      </div>
      <div id="ad-header" class="ad-placeholder ad-leaderboard"><span>Advertisement · 728×90</span></div>
      <div class="bs-tabs">
        <button class="bs-tab ${activeTab === 'conferences' ? 'active' : ''}" data-tab="conferences">Conferences</button>
        <button class="bs-tab ${activeTab === 'map' ? 'active' : ''}" data-tab="map">Map</button>
      </div>
    </div>
  `;
  document.getElementById('btn-reset').addEventListener('click', handleReset);
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('btn-presets').addEventListener('click', togglePresetsDropdown);
  document.querySelectorAll('.bs-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  renderPresetsDropdown();
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

function togglePresetsDropdown() {
  document.getElementById('presets-dropdown')?.classList.toggle('open');
}

// ─── RENDER: ANALYTICS PANEL ────────────────────────────────────────────────

function renderAnalyticsPanel() {
  const panel = document.getElementById('analytics-panel');
  if (!panel) return;
  const { travel, rivalries, tv_markets, balance } = state.analytics;

  let travelBase = null, rivalBase = null;
  if (baselineState) {
    let bTotal = 0, bCount = 0;
    Object.entries(baselineState).forEach(([, ids]) => {
      const d = avgPairwiseDist(ids);
      if (ids.length >= 2) { bTotal += d; bCount++; }
    });
    travelBase = bCount ? Math.round(bTotal / bCount) : 0;
    rivalBase  = countRivalriesPreserved(baselineState);
  }

  const tDeltaCls = travelBase !== null ? deltaClass(travel._overall, travelBase, true)  : 'flat';
  const tDeltaTxt = travelBase !== null ? deltaSymbol(travel._overall, travelBase) : '—';
  const rDeltaCls = rivalBase  !== null ? deltaClass(rivalries.preserved, rivalBase, false) : 'flat';
  const rDeltaTxt = rivalBase  !== null ? deltaSymbol(rivalries.preserved, rivalBase) : '—';

  const nonEmpty = ALL_CONFERENCES.filter(c => (balance.counts[c.id] || 0) > 0);

  const balanceRows = nonEmpty.map(c => {
    const count = balance.counts[c.id] || 0;
    const warn  = count < 8 || count > 20;
    return `<div class="balance-row ${warn ? 'balance-warn' : ''}">
      <span class="balance-conf" style="color:${c.color}">${c.name}</span>
      <span class="balance-count">${count} teams ${warn ? '⚠' : ''}</span>
    </div>`;
  }).join('');

  const topMarkets = [...new Set(Object.values(tv_markets).flat())].slice(0, 5).join(', ') || '—';

  panel.innerHTML = `
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
        <div class="bs-analytic-label">Rivalries</div>
        <div class="bs-analytic-value">${rivalries.preserved}/${rivalries.total}</div>
        <div class="bs-analytic-sub">${rivalries.pct}% preserved</div>
        <div class="bs-analytic-delta ${rDeltaCls}">${rDeltaTxt}</div>
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

  const allConfs = [...ALL_CONFERENCES, ...customConfs];

  container.innerHTML = `
    <div class="conf-board" id="conf-board">
      ${allConfs.map(conf => renderConferenceColumn(conf, state.conferences[conf.id] || [], teamMap)).join('')}
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

function renderConferenceColumn(conf, teamIds, teamMap) {
  const color = conf.color || hashColor(conf.id);
  const teams = teamIds.map(id => teamMap[id]).filter(Boolean);
  return `
    <div class="conf-column" data-conf-id="${conf.id}" id="col-${conf.id}">
      <div class="conf-col-header" style="border-top:3px solid ${color}">
        <div class="conf-col-title">
          <span class="conf-col-name">${conf.full_name || conf.name}</span>
          <span class="conf-col-badge">${teams.length}</span>
        </div>
        <div class="conf-col-actions">
          <button class="btn-rename-col" data-conf="${conf.id}" title="Rename">✏</button>
          <button class="btn-delete-col" data-conf="${conf.id}" title="Remove">×</button>
        </div>
      </div>
      <div class="conf-col-body droptarget" data-conf-id="${conf.id}">
        ${teams.map(team => renderTeamCard(team, conf.id)).join('')}
      </div>
    </div>
  `;
}

function renderTeamCard(team, confId) {
  const url = logoUrl(team.id);
  const logoHtml = url
    ? `<img class="team-logo" src="${url}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
    : '';
  const swatchStyle = url ? 'display:none' : '';
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
      <span class="team-card-short" style="color:${team.primary_color}">${team.short}</span>
    </div>
  `;
}

// ─── DRAG AND DROP ───────────────────────────────────────────────────────────

function bindDragDrop() {
  document.querySelectorAll('.team-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend',   onDragEnd);
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
  pushHistory();
  state.conferences[dragSourceConfId] = (state.conferences[dragSourceConfId] || []).filter(id => id !== draggedTeamId);
  if (!state.conferences[targetConfId]) state.conferences[targetConfId] = [];
  state.conferences[targetConfId].push(draggedTeamId);
  draggedTeamId = dragSourceConfId = null;
  scheduleAnalytics();
  scheduleHashUpdate();
  renderMain();
}

// ─── CONFERENCE MANAGEMENT ───────────────────────────────────────────────────

function handleAddConference() {
  const name = window.prompt('New conference name:');
  if (!name?.trim()) return;
  const id = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!id || state.conferences[id] !== undefined) {
    if (state.conferences[id] !== undefined) alert(`"${id}" already exists.`);
    return;
  }
  pushHistory();
  state.conferences[id] = [];
  renderMain();
  scheduleHashUpdate();
}

function handleDeleteConference(confId) {
  const teams = state.conferences[confId] || [];
  if (teams.length > 0) { alert(`Move all ${teams.length} team(s) out first.`); return; }
  if (!confirm(`Remove "${confId}"?`)) return;
  pushHistory();
  delete state.conferences[confId];
  renderMain();
  scheduleHashUpdate();
}

function handleRenameConference(confId) {
  const current = confDisplayName(confId);
  const newName = window.prompt(`Rename "${current}" to:`, current);
  if (!newName?.trim() || newName.trim() === current) return;
  const newId = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!newId) return;
  if (newId !== confId && state.conferences[newId] !== undefined) {
    alert(`"${newId}" already exists.`); return;
  }
  if (newId === confId) return; // name same as id, nothing to do (display name unchanged for built-in confs)
  pushHistory();
  // For custom confs: rename the key. For built-in confs we can't rename the key
  // since analytics etc. depend on the id — instead we track display name overrides.
  if (!ALL_CONFERENCES.find(c => c.id === confId)) {
    state.conferences[newId] = state.conferences[confId];
    delete state.conferences[confId];
  } else {
    // For built-in confs store a display override
    if (!state.renameOverrides) state.renameOverrides = {};
    state.renameOverrides[confId] = newName.trim();
  }
  renderMain();
  scheduleHashUpdate();
}

// ─── RENDER: MAP TAB ─────────────────────────────────────────────────────────

function renderMapTab(container) {
  container.innerHTML = `<div id="leaflet-map" style="width:100%;height:100%;min-height:500px"></div>`;
  requestAnimationFrame(() => initMap());
}

function initMap() {
  if (typeof L === 'undefined') { console.warn('Leaflet not loaded'); return; }
  const mapEl = document.getElementById('leaflet-map');
  if (!mapEl) return;
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  leafletMap = L.map('leaflet-map', { center: [38.5, -96.5], zoom: 4, zoomSnap: 0.5 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
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

function handleReset() {
  if (!confirm('Reset to default 2026 alignment? This clears undo history.')) return;
  history.past = []; history.future = [];
  const defaultConf = {};
  ALL_CONFERENCES.forEach(c => (defaultConf[c.id] = []));
  ALL_TEAMS.forEach(t => { if (defaultConf[t.conference] !== undefined) defaultConf[t.conference].push(t.id); });
  state.conferences = deepClone(defaultConf);
  baselineState     = deepClone(defaultConf);
  recomputeAnalytics(); renderAnalyticsPanel(); renderMain(); scheduleHashUpdate();
}

// ─── EXPORT: CANVAS INFOGRAPHIC ──────────────────────────────────────────────

async function handleExport() {
  // Copy share URL to clipboard
  const url = window.location.href.split('#')[0] + encodeHash(state.conferences);
  try { await navigator.clipboard.writeText(url); showToast('Share URL copied!'); }
  catch { window.prompt('Copy URL:', url); }

  // Generate canvas infographic
  const canvas = generateExportCanvas();
  const a = document.createElement('a');
  a.download = 'cfb-realignment.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
  showToast('Image downloaded!');
}

function generateExportCanvas() {
  // Layout constants
  const W = 1200, PAD = 32;
  const HEADER_H = 90, FOOTER_H = 48, STATS_H = 64;
  const CONF_START_Y = HEADER_H + 16;

  // Determine non-empty conferences
  const activeConfs = [...ALL_CONFERENCES, ...Object.keys(state.conferences)
    .filter(id => !ALL_CONFERENCES.find(c => c.id === id))
    .map(id => ({ id, name: id, full_name: id, color: hashColor(id) }))
  ].filter(c => (state.conferences[c.id] || []).length > 0);

  const teamMap = {};
  ALL_TEAMS.forEach(t => (teamMap[t.id] = t));

  // Row height per team
  const TEAM_ROW_H = 22;
  const COL_HEADER_H = 46;
  const maxTeams = Math.max(...activeConfs.map(c => (state.conferences[c.id] || []).length));
  const CONF_BLOCK_H = COL_HEADER_H + maxTeams * TEAM_ROW_H + 12;

  const H = HEADER_H + 16 + CONF_BLOCK_H + STATS_H + FOOTER_H + 16;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid texture
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Header gradient bar
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0,   '#7C2D12');
  grad.addColorStop(0.5, '#92400E');
  grad.addColorStop(1,   '#7C2D12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HEADER_H);

  // Title
  ctx.font = 'bold 36px "Barlow Condensed", Arial Narrow, Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('🏈 CFB CONFERENCE REALIGNMENT SIMULATOR', PAD, HEADER_H * 0.42);

  ctx.font = '16px "Inter", Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`cfb-realignment.app  ·  ${activeConfs.length} conferences  ·  ${ALL_TEAMS.length} teams`, PAD, HEADER_H * 0.75);

  // Conference columns
  const cols = activeConfs.length;
  const COL_W = Math.floor((W - PAD * 2 - (cols - 1) * 8) / cols);
  let cx = PAD;
  const cy = CONF_START_Y;

  activeConfs.forEach(conf => {
    const teams = (state.conferences[conf.id] || []).map(id => teamMap[id]).filter(Boolean);
    const color = conf.color || hashColor(conf.id);

    // Column background
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(ctx, cx, cy, COL_W, CONF_BLOCK_H, 8);
    ctx.fill();

    // Top accent bar
    ctx.fillStyle = color;
    roundRectTop(ctx, cx, cy, COL_W, 4, 8);
    ctx.fill();

    // Conference name
    ctx.font = `bold ${Math.min(14, Math.floor(COL_W / 8))}px "Barlow Condensed", Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const label = conf.name || conf.id.toUpperCase();
    ctx.fillText(label, cx + 10, cy + 16);

    // Team count badge
    ctx.font = 'bold 11px "Inter", Arial';
    ctx.fillStyle = color;
    ctx.fillText(`${teams.length}`, cx + COL_W - 28, cy + 16);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy + COL_HEADER_H - 4);
    ctx.lineTo(cx + COL_W - 8, cy + COL_HEADER_H - 4);
    ctx.stroke();

    // Team rows
    teams.forEach((team, i) => {
      const ty = cy + COL_HEADER_H + i * TEAM_ROW_H + TEAM_ROW_H / 2;

      // Color swatch
      ctx.fillStyle = team.primary_color || color;
      ctx.fillRect(cx + 8, ty - 7, 3, 14);

      // Team name (truncate if needed)
      ctx.font = `${Math.min(11, Math.floor(COL_W / 14))}px "Inter", Arial`;
      ctx.fillStyle = '#E8E8E8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const maxW = COL_W - 44;
      let name = team.name;
      while (ctx.measureText(name).width > maxW && name.length > 4) name = name.slice(0, -1);
      if (name !== team.name) name += '…';
      ctx.fillText(name, cx + 16, ty);
    });

    cx += COL_W + 8;
  });

  // Stats bar
  const statsY = cy + CONF_BLOCK_H + 12;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(ctx, PAD, statsY, W - PAD * 2, STATS_H, 8);
  ctx.fill();

  const { travel, rivalries, balance } = state.analytics;
  const stats = [
    { label: 'Avg Travel', value: `${travel._overall.toLocaleString()} mi/conf` },
    { label: 'Rivalries Preserved', value: `${rivalries.preserved}/${rivalries.total} (${rivalries.pct}%)` },
    { label: 'Team Balance', value: `avg ${balance.avg} · min ${balance.min} · max ${balance.max}` },
    { label: 'Conferences', value: `${activeConfs.length} active` },
  ];
  const statW = (W - PAD * 2) / stats.length;
  stats.forEach((s, i) => {
    const sx = PAD + i * statW + statW / 2;
    const sy = statsY + STATS_H / 2;
    ctx.font = 'bold 18px "Barlow Condensed", Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.value, sx, sy - 8);
    ctx.font = '11px "Inter", Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(s.label.toUpperCase(), sx, sy + 12);
  });

  // Footer
  const footerY = statsY + STATS_H + 8;
  ctx.font = '12px "Inter", Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Made with cfb-realignment.app — github.com/colemccall/cfb-realignment-tool', W / 2, footerY + FOOTER_H / 2);

  return canvas;
}

// Canvas helpers
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── PRESETS ─────────────────────────────────────────────────────────────────

function applyPreset(presetId) {
  const preset = getPresets(ALL_TEAMS, ALL_CONFERENCES).find(p => p.id === presetId);
  if (!preset) return;
  pushHistory();
  const newConf = preset.getConferences();
  ALL_CONFERENCES.forEach(c => { if (!newConf[c.id]) newConf[c.id] = []; });
  state.conferences = newConf;
  document.getElementById('presets-dropdown')?.classList.remove('open');
  recomputeAnalytics(); renderAnalyticsPanel(); renderMain(); scheduleHashUpdate();
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
