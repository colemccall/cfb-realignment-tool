/**
 * presets.js — Conference Realignment Simulator
 * Exports getPresets(ALL_TEAMS, ALL_CONFERENCES) → array of preset objects.
 * Each preset has: { id, name, description, getConferences() }
 */

export function getPresets(ALL_TEAMS, ALL_CONFERENCES) {

  function defaultMap() {
    const m = {};
    ALL_CONFERENCES.forEach(c => (m[c.id] = []));
    ALL_TEAMS.forEach(t => {
      if (m[t.conference] !== undefined) m[t.conference].push(t.id);
    });
    return m;
  }

  return [

    {
      id: 'current-2026',
      name: 'Current 2026',
      description: 'Default alignment as of the 2026 season',
      getConferences: () => defaultMap(),
    },

    {
      id: 'super-conferences',
      name: 'Super Conferences',
      description: '4 mega-conferences realigned by geography',
      getConferences: () => {
        // Split CONUS into 4 geo zones; Hawaii goes West
        const zones = { sec: [], 'big-ten': [], 'big-12': [], acc: [] };
        ALL_TEAMS.forEach(t => {
          // West: lng < -105 (Mountain, Pacific)
          if (t.lng < -105 || t.tv_market === 'Honolulu') {
            zones['big-12'].push(t.id);
          // South: lat < 36.5 and lng < -85 (SEC belt)
          } else if (t.lat < 36.5 && t.lng < -85) {
            zones['sec'].push(t.id);
          // East: lng > -80 (Atlantic seaboard)
          } else if (t.lng > -80) {
            zones['acc'].push(t.id);
          // Midwest: everything else
          } else {
            zones['big-ten'].push(t.id);
          }
        });
        return zones;
      },
    },

    {
      id: 'restore-traditions',
      name: 'Restore Traditions',
      description: 'Move Texas & Oklahoma back to Big 12; keep all other rivalries intact',
      getConferences: () => {
        const m = defaultMap();
        // Move Texas and Oklahoma back to Big 12 (they historically belong there)
        ['texas', 'oklahoma'].forEach(id => {
          m['sec'] = (m['sec'] || []).filter(x => x !== id);
          if (!m['big-12'].includes(id)) m['big-12'].push(id);
        });
        return m;
      },
    },

    {
      id: 'tv-exec-mode',
      name: 'TV Exec Mode',
      description: 'Biggest TV markets spread evenly across P5 — pure eyeball math',
      getConferences: () => {
        const p5 = ['sec', 'big-ten', 'big-12', 'acc', 'aac'];
        const m = {};
        ALL_CONFERENCES.forEach(c => (m[c.id] = []));
        // Sort all teams by DMA rank ascending (lower = bigger market)
        const sorted = [...ALL_TEAMS].sort((a, b) => a.tv_market_size - b.tv_market_size);
        sorted.forEach((t, i) => {
          const confId = p5[i % p5.length];
          m[confId].push(t.id);
        });
        return m;
      },
    },

  ];
}
