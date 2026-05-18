/**
 * presets.js — Conference Realignment Simulator
 * Five presets: 3 historical years + 2 hypothetical scenarios.
 */

export function getPresets(ALL_TEAMS, ALL_CONFERENCES) {

  // Build default conference map from teams.json conference field
  function defaultMap() {
    const m = {};
    ALL_CONFERENCES.forEach(c => (m[c.id] = []));
    ALL_TEAMS.forEach(t => {
      if (m[t.conference] !== undefined) m[t.conference].push(t.id);
    });
    return m;
  }

  // Move a team from one conf to another (mutates map)
  function move(m, teamId, toConf) {
    Object.keys(m).forEach(cid => {
      m[cid] = m[cid].filter(id => id !== teamId);
    });
    if (!m[toConf]) m[toConf] = [];
    m[toConf].push(teamId);
  }

  return [

    // ─── 1. CURRENT 2026 ───────────────────────────────────────────────────
    {
      id: 'current-2026',
      name: 'Current 2026',
      description: 'Actual alignment as of the 2026 season',
      getConferences: () => defaultMap(),
    },

    // ─── 2. 2022: PAC-12 LIVES ─────────────────────────────────────────────
    // Before the 2024 Big Ten / SEC expansions.
    // Pac-12 intact with all 12. Big 12 still has Texas & Oklahoma (10 teams).
    // SEC/Big Ten stay at 14. Stanford/Cal/SMU not yet in ACC.
    {
      id: 'classic-2022',
      name: '2022: Pac-12 Lives',
      description: 'Before the 2024 wave — Pac-12 intact, Texas & OU still in Big 12',
      getConferences: () => {
        const m = defaultMap();

        // Restore Pac-12 (pull West teams out of their 2026 conferences)
        const pac12 = [
          'usc', 'ucla', 'oregon', 'washington',       // defected to Big Ten
          'oregon-state', 'washington-state',           // went independent
          'utah', 'colorado', 'arizona', 'arizona-state', // defected to Big 12
          'stanford', 'california',                     // defected to ACC
        ];
        pac12.forEach(id => move(m, id, 'pac-12'));

        // Texas & Oklahoma back to Big 12 (they're in SEC in 2026)
        move(m, 'texas',    'big-12');
        move(m, 'oklahoma', 'big-12');

        // Big 12 had only 10 teams in 2022 — pull 2023 additions back to their old homes
        // Cincinnati, Houston, UCF → AAC (they joined Big 12 in 2023)
        ['cincinnati', 'houston', 'ucf'].forEach(id => move(m, id, 'aac'));
        // BYU → independent (joined Big 12 in 2023)
        move(m, 'byu', 'independent');
        // SMU → AAC (was in AAC before joining ACC in 2024)
        move(m, 'smu', 'aac');

        // Stanford & Cal are in pac-12 already (moved above)
        // Clear the pac-12's empty slot in default (it had 0 teams in 2026 default)
        return m;
      },
    },

    // ─── 3. 2014: THE OLD ORDER ─────────────────────────────────────────────
    // Modern conferences settled in, but before any 2024 chaos.
    // Big Ten at 14 (just added Rutgers & Maryland), Pac-12 at 12,
    // Big 12 at 10, SEC at 14, ACC at 14. No P5 super-expansions.
    {
      id: 'old-order-2014',
      name: '2014: The Old Order',
      description: 'Conferences as they stood for a decade — the last "stable" era',
      getConferences: () => {
        const m = defaultMap();

        // Restore Pac-12 same as 2022
        const pac12 = ['usc', 'ucla', 'oregon', 'washington',
                        'oregon-state', 'washington-state',
                        'utah', 'colorado', 'arizona', 'arizona-state',
                        'stanford', 'california'];
        pac12.forEach(id => move(m, id, 'pac-12'));

        // Texas & Oklahoma back to Big 12
        move(m, 'texas',    'big-12');
        move(m, 'oklahoma', 'big-12');

        // Big 12 additions from 2023 → back to AAC / Independent
        ['cincinnati', 'houston', 'ucf'].forEach(id => move(m, id, 'aac'));
        move(m, 'byu', 'independent');

        // SMU was in AAC/not P5 in 2014
        move(m, 'smu', 'aac');

        // ACC: Charlotte & FAU joined later — pull them back to AAC/CUSA where they were
        // (they're already in AAC in our dataset; no further action needed)

        // Big Ten in 2014 did NOT yet have USC/UCLA/Oregon/Washington — already handled.
        // Rutgers & Maryland joined Big Ten in 2014 — keep them there.

        return m;
      },
    },

    // ─── 4. SUPER CONFERENCES: FINAL FOUR ──────────────────────────────────
    // Four massive geo-conferences absorb everything. ~33 teams each.
    {
      id: 'super-conferences',
      name: 'Super Conferences',
      description: '4 mega-conferences split by geography — 130+ teams, 4 winners',
      getConferences: () => {
        const zones = { sec: [], 'big-ten': [], 'big-12': [], acc: [] };
        ALL_TEAMS.forEach(t => {
          if (t.tv_market === 'Honolulu' || t.lng < -110) {
            zones['big-12'].push(t.id);   // Far West → Big 12
          } else if (t.lng < -100) {
            zones['sec'].push(t.id);       // Mountain/Plains → SEC (Texas belt)
          } else if (t.lat < 36.5 && t.lng < -80) {
            zones['sec'].push(t.id);       // Deep South → SEC
          } else if (t.lat >= 40 || t.lng > -80) {
            zones['acc'].push(t.id);       // Northeast / Atlantic → ACC
          } else {
            zones['big-ten'].push(t.id);   // Midwest corridor → Big Ten
          }
        });
        // Wipe unused conferences
        const m = {};
        ALL_CONFERENCES.forEach(c => (m[c.id] = []));
        Object.assign(m, zones);
        return m;
      },
    },

    // ─── 5. TV EXEC MODE ───────────────────────────────────────────────────
    // Pure eyeball math: sort all 133 teams by DMA market rank (lower = bigger),
    // then deal them round-robin to the 5 power conferences.
    {
      id: 'tv-exec-mode',
      name: 'TV Exec Mode',
      description: 'Biggest TV markets spread evenly across P5 — pure eyeball math',
      getConferences: () => {
        const p5 = ['sec', 'big-ten', 'big-12', 'acc', 'aac'];
        const m = {};
        ALL_CONFERENCES.forEach(c => (m[c.id] = []));
        const sorted = [...ALL_TEAMS].sort((a, b) => a.tv_market_size - b.tv_market_size);
        sorted.forEach((t, i) => {
          m[p5[i % p5.length]].push(t.id);
        });
        return m;
      },
    },

  ];
}
