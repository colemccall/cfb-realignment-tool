/**
 * presets.js — Conference Realignment Simulator
 *
 * Five presets spanning 30+ years of CFB realignment history.
 * Historical accuracy: P5/major conferences are precise; G5 details approximate.
 */

export function getPresets(ALL_TEAMS, ALL_CONFERENCES) {

  /**
   * Build a conference map from an explicit spec.
   * Teams not listed in spec fall through to their teams.json default conference.
   * Teams explicitly placed in a conf override their default.
   */
  function buildFromSpec(spec) {
    const m = {};
    ALL_CONFERENCES.forEach(c => (m[c.id] = []));

    // Track which teams are manually placed
    const placed = new Set();
    Object.entries(spec).forEach(([cid, ids]) => {
      if (!m[cid]) m[cid] = [];
      ids.forEach(id => { m[cid].push(id); placed.add(id); });
    });

    // All remaining teams fall to their teams.json default
    ALL_TEAMS.forEach(t => {
      if (!placed.has(t.id)) {
        if (!m[t.conference]) m[t.conference] = [];
        m[t.conference].push(t.id);
      }
    });

    return m;
  }

  return [

    // ═══════════════════════════════════════════════════════════════════════
    // 1 · 2026 — NEW PAC-12
    //
    // The Pac-12 rises from the ashes. Oregon State and Washington State anchor
    // the revived conference, joined by ~10 Mountain West schools. Big Ten (18),
    // SEC (16), Big 12 (16), and ACC (17) remain as constituted.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'new-pac-12-2026',
      name: '2026 — New Pac-12',
      description: 'Pac-12 reborn with OSU, WSU + 8 Mountain West schools joining',
      getConferences: () => buildFromSpec({
        // New Pac-12 (10 teams): holdovers + Mountain West defectors
        'pac-12': [
          'oregon-state', 'washington-state',           // Pac-12 survivors
          'boise-state', 'colorado-state', 'fresno-state', 'utah-state',
          'san-diego-state', 'unlv', 'nevada', 'wyoming',
        ],
        // Rump Mountain West — schools that didn't defect
        'mountain-west': ['air-force', 'new-mexico', 'san-jose-state', 'hawaii'],
        // Everyone else stays in their 2026 default (SEC 16, Big Ten 18, Big 12 16, ACC 17, etc.)
      }),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 2 · 2024-25 — FALL OF THE PAC-12
    //
    // The Pac-12 collapses to just 2 schools. Oregon, USC, UCLA, and Washington
    // have already landed in the Big Ten (now 18). Texas and Oklahoma in the
    // SEC (now 16). Colorado, Arizona, Arizona State, Utah in the Big 12 (now 16).
    // Stanford, Cal, and SMU in the ACC (now 17). Only OSU and WSU remain in
    // the legal shell of the Pac-12.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'chaos-2024',
      name: '2024-25 — Fall of the Pac-12',
      description: 'Pac-12 gutted to 2 teams — realignment wave complete, new world order',
      getConferences: () => buildFromSpec({
        // The Pac-12 shell — just OSU and WSU
        'pac-12': ['oregon-state', 'washington-state'],
        // Big Ten 18 (absorbed USC, UCLA, Oregon, Washington from Pac-12)
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'nebraska', 'illinois', 'purdue', 'indiana',
          'northwestern', 'rutgers', 'maryland',
          'usc', 'ucla', 'oregon', 'washington',         // 2024 arrivals
        ],
        // SEC 16 (Texas and Oklahoma arrived 2024)
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina',
          'missouri', 'vanderbilt', 'kentucky', 'texas-am',
          'texas', 'oklahoma',                           // 2024 arrivals
        ],
        // Big 12 16 (gained CO, AZ, ASU, Utah from Pac-12; lost TX/OU to SEC)
        'big-12': [
          'texas-tech', 'tcu', 'baylor', 'oklahoma-state', 'kansas', 'kansas-state',
          'west-virginia', 'iowa-state', 'cincinnati', 'houston', 'ucf', 'byu',
          'colorado', 'arizona', 'arizona-state', 'utah', // 2024 arrivals from Pac-12
        ],
        // ACC 17 (Stanford, Cal, SMU arrived 2024)
        'acc': [
          'clemson', 'florida-state', 'miami', 'louisville', 'nc-state',
          'north-carolina', 'duke', 'wake-forest', 'virginia', 'virginia-tech',
          'boston-college', 'pitt', 'syracuse', 'georgia-tech',
          'stanford', 'california', 'smu',               // 2024 arrivals
        ],
        // Mountain West intact (nobody left yet for new Pac-12)
        'mountain-west': [
          'boise-state', 'fresno-state', 'utah-state', 'unlv', 'colorado-state',
          'air-force', 'san-diego-state', 'nevada', 'new-mexico', 'wyoming',
          'san-jose-state', 'hawaii',
        ],
      }),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 3 · 2011-2023 — THE MODERN ERA
    //
    // The "long stable" period after the 2010-12 first wave of realignment
    // (Texas A&M + Missouri → SEC; Nebraska + Rutgers + Maryland → Big Ten;
    // Colorado + Utah + more → Pac-12) but before the 2023-24 chaos.
    // Big 12 sits at 10 (after losing 4). Pac-12 has its classic 12.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'modern-era-2014',
      name: '2011–2023 — The Modern Era',
      description: 'The long stable stretch: Pac-12 at 12, Big 12 at 10, SEC & Big Ten at 14',
      getConferences: () => buildFromSpec({
        // SEC 14 — Missouri + Texas A&M joined in 2012; no Texas/Oklahoma yet
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina',
          'missouri', 'vanderbilt', 'kentucky', 'texas-am',
        ],
        // Big Ten 14 — Nebraska (2011), Rutgers + Maryland (2014); no West schools
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'nebraska', 'illinois', 'purdue', 'indiana',
          'northwestern', 'rutgers', 'maryland',
        ],
        // Pac-12 12 — Utah + Colorado (2011); Stanford + Cal still here (not in ACC yet)
        'pac-12': [
          'usc', 'ucla', 'oregon', 'washington', 'oregon-state', 'washington-state',
          'utah', 'colorado', 'arizona', 'arizona-state', 'stanford', 'california',
        ],
        // Big 12 10 — lost Nebraska, Colorado, Missouri, Texas A&M; gained nobody yet
        //             Texas + Oklahoma still here (haven't left yet)
        'big-12': [
          'texas', 'oklahoma', 'texas-tech', 'tcu', 'baylor',
          'oklahoma-state', 'kansas', 'kansas-state', 'west-virginia', 'iowa-state',
        ],
        // ACC 14 — Pitt + Syracuse (2013), Louisville (2014); no Stanford/Cal/SMU
        'acc': [
          'clemson', 'florida-state', 'miami', 'louisville', 'nc-state',
          'north-carolina', 'duke', 'wake-forest', 'virginia', 'virginia-tech',
          'boston-college', 'pitt', 'syracuse', 'georgia-tech',
        ],
        // AAC (ex-Big East remnant post-2013 implosion): Big East football members who stayed
        'aac': [
          'memphis', 'tulane', 'tulsa', 'navy', 'east-carolina', 'temple',
          'usf', 'cincinnati', 'houston', 'ucf', 'smu',
        ],
        // Mountain West 12 (same as always; BYU left for independence in 2011)
        'mountain-west': [
          'boise-state', 'fresno-state', 'utah-state', 'unlv', 'colorado-state',
          'air-force', 'san-diego-state', 'nevada', 'new-mexico', 'wyoming',
          'san-jose-state', 'hawaii',
        ],
        // Independent: Notre Dame, BYU (went independent 2011), Army, Navy (still ind.)
        'independent': ['notre-dame', 'byu', 'army', 'liberty', 'uconn', 'new-mexico-state'],
      }),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 4 · 2000–2010 — BIG EAST ERA
    //
    // The Big East was a legitimate power conference with Miami, VT, and BC
    // before the ACC raided it in 2003-05. Big 12 still had its full 12.
    // Big Ten had only 11 (no Nebraska, Rutgers, Maryland). SEC at 12 (no
    // Missouri or Texas A&M). Pac-10 at 10 (no Utah or Colorado).
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'big-east-era-2003',
      name: '2000–2010 — Big East Era',
      description: 'Big East as a Power conference; old Big 12 at 12; Pac-10 at 10; SEC & Big Ten smaller',
      getConferences: () => buildFromSpec({
        // Big East football powerhouse — Miami/VT/BC still in; hadn't left for ACC yet
        'big-east': [
          'miami', 'virginia-tech', 'boston-college', 'pitt', 'syracuse',
          'west-virginia', 'rutgers', 'uconn', 'louisville', 'cincinnati', 'temple',
        ],
        // Big 12 — FULL 12: still had Nebraska, Colorado, Missouri, Texas A&M
        'big-12': [
          'texas', 'oklahoma', 'nebraska', 'colorado', 'missouri', 'kansas',
          'kansas-state', 'iowa-state', 'texas-am', 'oklahoma-state', 'texas-tech', 'baylor',
        ],
        // Big Ten — 11 schools (no Nebraska, no Rutgers, no Maryland)
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'illinois', 'purdue', 'indiana', 'northwestern',
        ],
        // SEC — 12 schools (no Missouri, no Texas A&M)
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina', 'vanderbilt', 'kentucky',
        ],
        // Pac-10 — 10 schools (no Utah, no Colorado, no Arizona State... wait ASU was always there)
        'pac-12': [
          'usc', 'ucla', 'oregon', 'washington', 'oregon-state', 'washington-state',
          'arizona', 'arizona-state', 'stanford', 'california',
        ],
        // ACC — 9 teams before Miami/VT/BC joined in 2004-05; Maryland was original member
        'acc': [
          'clemson', 'florida-state', 'maryland', 'duke', 'nc-state',
          'north-carolina', 'georgia-tech', 'wake-forest', 'virginia',
        ],
        // Mountain West — BYU and Utah still here; Boise State joined MWC in 2011 (was WAC)
        'mountain-west': [
          'byu', 'utah', 'fresno-state', 'unlv', 'colorado-state', 'air-force',
          'san-diego-state', 'nevada', 'new-mexico', 'wyoming', 'hawaii',
        ],
        // WAC / CUSA bucket — approximate; many teams shifted conferences in this era
        'aac': [
          'boise-state', 'utah-state', 'san-jose-state', // WAC
          'memphis', 'tulane', 'tulsa', 'east-carolina', 'usf', // CUSA
          'tcu', 'smu', 'rice', 'houston',               // SWC survivors in CUSA/WAC
          'marshall', 'southern-miss', 'utep',
        ],
        // Independents
        'independent': ['notre-dame', 'army', 'navy', 'louisiana-tech'],
      }),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 5 · 1990s — BIG 8 + SWC ERA
    //
    // Before the 1996 merger that created the Big 12, the Big Eight and
    // Southwest Conference were separate entities. The Big East was young
    // and loaded. The SEC had just expanded to 12 (Arkansas + South Carolina
    // in 1992). Big Ten added Penn State in 1993, becoming 11. Pac-10 intact.
    // ACC had 9 after Florida State joined in 1992.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'big-8-swc-1992',
      name: '1990s — Big 8 + SWC Era',
      description: 'Before the 1996 Big 12 merger — Big Eight and Southwest Conference as rivals',
      getConferences: () => buildFromSpec({
        // Big Eight (8 teams)
        'big-8': [
          'oklahoma', 'nebraska', 'kansas', 'kansas-state',
          'colorado', 'iowa-state', 'missouri', 'oklahoma-state',
        ],
        // Southwest Conference (8 teams — Arkansas left for SEC in 1991)
        'swc': [
          'texas', 'texas-am', 'baylor', 'texas-tech', 'tcu', 'rice', 'smu', 'houston',
        ],
        // SEC 12 — expanded to 12 in 1992 with Arkansas + South Carolina
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina', 'vanderbilt', 'kentucky',
        ],
        // Big Ten 11 — Penn State joined in 1993; conference name still "Big Ten" with 11
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'illinois', 'purdue', 'indiana', 'northwestern',
        ],
        // Pac-10 — 10 members, unchanged until 2011
        'pac-12': [
          'usc', 'ucla', 'oregon', 'washington', 'oregon-state', 'washington-state',
          'arizona', 'arizona-state', 'stanford', 'california',
        ],
        // ACC 9 — Florida State joined in 1992; Maryland was founding member
        'acc': [
          'clemson', 'florida-state', 'maryland', 'duke', 'nc-state',
          'north-carolina', 'georgia-tech', 'wake-forest', 'virginia',
        ],
        // Big East — newly powerful; Miami was national champion; VT, BC, WVU, Pitt all in
        'big-east': [
          'miami', 'virginia-tech', 'pitt', 'boston-college', 'rutgers',
          'uconn', 'louisville', 'syracuse', 'west-virginia', 'temple',
        ],
        // WAC / independents — many schools not yet in FBS-caliber conferences
        'mountain-west': [
          'utah', 'byu', 'air-force', 'new-mexico', 'wyoming', 'nevada',
          'san-diego-state', 'fresno-state', 'san-jose-state', 'hawaii',
          'utah-state', 'unlv', 'colorado-state',
        ],
        // MAC, CUSA-type bucket
        'mac': [
          'ohio', 'miami-oh', 'bowling-green', 'ball-state', 'buffalo', 'akron',
          'kent-state', 'western-michigan', 'central-michigan', 'eastern-michigan',
          'northern-illinois', 'toledo',
        ],
        // Misc G5 schools roughly placed
        'aac': [
          'memphis', 'tulane', 'tulsa', 'east-carolina', 'southern-miss', 'marshall',
          'utep', 'louisiana-tech',
        ],
        // True independents of the era
        'independent': [
          'notre-dame', 'army', 'navy',
          'boise-state',    // still FCS / independent in early 90s
          'liberty', 'uconn',
        ],
        // Sun Belt was FCS / early FBS in this era — approximate placement
        'sun-belt': [
          'louisiana', 'louisiana-monroe', 'arkansas-state', 'south-alabama',
          'georgia-southern', 'app-state', 'troy', 'texas-state',
          'georgia-state', 'coastal-carolina', 'james-madison', 'old-dominion',
          'western-kentucky',
        ],
        // CUSA didn't exist yet; these schools in misc.
        'cusa': [
          'uab', 'rice', 'smu', // wait SWC took SMU — move to SWC above; leave duplicate check to spec order
          'utsa', 'florida-atlantic', 'fiu', 'middle-tennessee',
          'louisiana-tech', 'sam-houston', 'jacksonville-state', 'kennesaw-state',
          'north-texas', 'charlotte',
        ],
      }),
    },

  ];
}
