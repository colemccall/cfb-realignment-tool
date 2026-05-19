/**
 * presets.js — Conference Realignment Simulator
 *
 * Five historically verified snapshots of FBS conference alignment.
 * Sources: SI realignment history, Wikipedia conference pages, NCAA records.
 *
 * buildFromSpec(spec, eraYear):
 *   - Teams in spec are placed as listed (first occurrence wins).
 *   - Unlisted teams fall back to their teams.json default conference.
 *   - If eraYear set, unlisted teams with fbs_since > eraYear go to 'fcs' column.
 */

export function getPresets(ALL_TEAMS, ALL_CONFERENCES) {

  function buildFromSpec(spec, eraYear = null) {
    const m = {};
    ALL_CONFERENCES.forEach(c => (m[c.id] = []));
    if (!m['fcs']) m['fcs'] = [];

    const placed = new Set();
    Object.entries(spec).forEach(([cid, ids]) => {
      if (!m[cid]) m[cid] = [];
      ids.forEach(id => {
        if (!placed.has(id)) {
          m[cid].push(id);
          placed.add(id);
        }
      });
    });

    ALL_TEAMS.forEach(t => {
      if (!placed.has(t.id)) {
        if (eraYear && t.fbs_since && t.fbs_since > eraYear) {
          m['fcs'].push(t.id);
        } else {
          if (!m[t.conference]) m[t.conference] = [];
          m[t.conference].push(t.id);
        }
      }
    });

    return m;
  }

  return [

    // ═══════════════════════════════════════════════════════════════════════
    // 1 · 2026 — NEW PAC-12
    //
    // The Pac-12 brand revived July 1, 2026. Oregon State and Washington State
    // anchor the conference alongside 8 Mountain West defectors: Boise State,
    // Colorado State, Fresno State, San Diego State, Utah State, UNLV, Nevada,
    // Wyoming. Texas State also joins from the Sun Belt.
    // Remaining MWC: Air Force, New Mexico, San Jose State, Hawaii, UTEP.
    // Big Ten 18, SEC 16, Big 12 16, ACC 17 all unchanged from 2024.
    // Temple remains independent after AAC expulsion in 2024.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'new-pac-12-2026',
      name: '2026 — New Pac-12',
      description: 'Pac-12 reborn with OSU, WSU + 8 MWC defectors + Texas State. Big Ten 18, SEC 16, ACC 17 intact.',
      getConferences: () => buildFromSpec({
        'pac-12': [
          'oregon-state', 'washington-state',
          'boise-state', 'colorado-state', 'fresno-state', 'utah-state',
          'san-diego-state', 'unlv', 'nevada', 'wyoming', 'texas-state',
        ],
        // MWC remnant: 5 schools remain after losing 7 to Pac-12 + UTEP joins from CUSA
        'mountain-west': ['air-force', 'new-mexico', 'san-jose-state', 'hawaii', 'utep'],
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'nebraska', 'illinois', 'purdue', 'indiana',
          'northwestern', 'rutgers', 'maryland',
          'usc', 'ucla', 'oregon', 'washington',
        ],
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina',
          'missouri', 'vanderbilt', 'kentucky', 'texas-am',
          'texas', 'oklahoma',
        ],
        'big-12': [
          'baylor', 'byu', 'cincinnati', 'houston', 'iowa-state', 'kansas',
          'kansas-state', 'oklahoma-state', 'tcu', 'texas-tech', 'ucf',
          'west-virginia', 'arizona', 'arizona-state', 'colorado', 'utah',
        ],
        'acc': [
          'clemson', 'florida-state', 'miami', 'louisville', 'nc-state',
          'north-carolina', 'duke', 'wake-forest', 'virginia', 'virginia-tech',
          'boston-college', 'pitt', 'syracuse', 'georgia-tech',
          'stanford', 'california', 'smu',
        ],
        'aac': [
          'memphis', 'tulane', 'tulsa', 'navy', 'army', 'east-carolina',
          'usf', 'charlotte', 'north-texas', 'uab', 'rice', 'utsa', 'florida-atlantic',
        ],
        'independent': ['notre-dame', 'uconn', 'new-mexico-state', 'temple'],
      }),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 2 · 2024-25 — FALL OF THE PAC-12
    //
    // The great implosion. Oregon, USC, UCLA, Washington join Big Ten (18).
    // Texas and Oklahoma arrive in SEC (16). Colorado, Arizona, Arizona State,
    // Utah join Big 12 (16). Stanford, Cal, SMU join ACC (17). Cincy, Houston,
    // UCF, BYU join Big 12 (2023). Oregon State and Washington State left as
    // Pac-12 shell. Temple expelled from AAC (2024) → independent.
    // Army joins AAC as football-only member (2024). Liberty joins CUSA (2023).
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'chaos-2024',
      name: '2024-25 — Fall of the Pac-12',
      description: 'Pac-12 down to 2. Big Ten 18, SEC 16, Big 12 16, ACC 17. Temple expelled. Army joins AAC.',
      getConferences: () => buildFromSpec({
        'pac-12': ['oregon-state', 'washington-state'],
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'nebraska', 'illinois', 'purdue', 'indiana',
          'northwestern', 'rutgers', 'maryland',
          'usc', 'ucla', 'oregon', 'washington',
        ],
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina',
          'missouri', 'vanderbilt', 'kentucky', 'texas-am',
          'texas', 'oklahoma',
        ],
        'big-12': [
          'baylor', 'byu', 'cincinnati', 'houston', 'iowa-state', 'kansas',
          'kansas-state', 'oklahoma-state', 'tcu', 'texas-tech', 'ucf',
          'west-virginia', 'arizona', 'arizona-state', 'colorado', 'utah',
        ],
        'acc': [
          'clemson', 'florida-state', 'miami', 'louisville', 'nc-state',
          'north-carolina', 'duke', 'wake-forest', 'virginia', 'virginia-tech',
          'boston-college', 'pitt', 'syracuse', 'georgia-tech',
          'stanford', 'california', 'smu',
        ],
        'mountain-west': [
          'air-force', 'boise-state', 'colorado-state', 'fresno-state', 'hawaii',
          'nevada', 'new-mexico', 'san-diego-state', 'san-jose-state', 'unlv',
          'utah-state', 'wyoming',
        ],
        // AAC 2024: Army joins; Temple out; Big 12 raiders gone since 2023
        'aac': [
          'memphis', 'tulane', 'tulsa', 'navy', 'army', 'east-carolina',
          'usf', 'charlotte', 'north-texas', 'uab', 'rice', 'utsa', 'florida-atlantic',
        ],
        // CUSA 2024: Liberty, Jacksonville State, Sam Houston, Kennesaw State in
        'cusa': [
          'fiu', 'jacksonville-state', 'kennesaw-state', 'liberty',
          'louisiana-tech', 'middle-tennessee', 'new-mexico-state',
          'sam-houston', 'utep', 'western-kentucky',
        ],
        'sun-belt': [
          'app-state', 'arkansas-state', 'coastal-carolina', 'georgia-southern',
          'georgia-state', 'james-madison', 'louisiana', 'louisiana-monroe',
          'marshall', 'old-dominion', 'south-alabama', 'southern-miss',
          'texas-state', 'troy',
        ],
        'mac': [
          'akron', 'ball-state', 'bowling-green', 'buffalo', 'central-michigan',
          'eastern-michigan', 'kent-state', 'miami-oh', 'northern-illinois',
          'ohio', 'toledo', 'western-michigan',
        ],
        'independent': ['notre-dame', 'uconn', 'new-mexico-state', 'temple'],
      }),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 3 · 2014-2022 — THE MODERN ERA
    //
    // Post-first-wave stability. Nebraska/Colorado left Big 12 for B1G/Pac-12
    // in 2011. Missouri and Texas A&M joined SEC in 2012 (SEC → 14). Maryland
    // and Rutgers joined Big Ten in 2014 (B1G → 14). Pac-12 at 12 (Utah/Colorado
    // joined 2011). Big 12 at 10 (Texas and Oklahoma still there). ACC at 14
    // (Pitt/Syracuse 2013, Louisville 2014). Big East collapsed → spawned AAC.
    // BYU went independent 2011. Army joined AAC 2016. UConn left AAC 2020.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'modern-era-2014',
      name: '2014–2022 — The Modern Era',
      description: 'Pac-12 at 12, Big 12 at 10 (TX+OU still in), SEC/Big Ten at 14, ACC at 14.',
      getConferences: () => buildFromSpec({
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina',
          'missouri', 'vanderbilt', 'kentucky', 'texas-am',
        ],
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'nebraska', 'illinois', 'purdue', 'indiana',
          'northwestern', 'rutgers', 'maryland',
        ],
        'pac-12': [
          'usc', 'ucla', 'oregon', 'washington', 'oregon-state', 'washington-state',
          'utah', 'colorado', 'arizona', 'arizona-state', 'stanford', 'california',
        ],
        'big-12': [
          'texas', 'oklahoma', 'texas-tech', 'tcu', 'baylor',
          'oklahoma-state', 'kansas', 'kansas-state', 'west-virginia', 'iowa-state',
        ],
        'acc': [
          'clemson', 'florida-state', 'miami', 'louisville', 'nc-state',
          'north-carolina', 'duke', 'wake-forest', 'virginia', 'virginia-tech',
          'boston-college', 'pitt', 'syracuse', 'georgia-tech',
        ],
        // AAC 2014: rebranded from Big East; Cincy/Houston/UCF/SMU/Temple/Tulane/Tulsa/Navy/ECU/USF
        // Army joined AAC 2016; UConn was member through 2019
        'aac': [
          'memphis', 'tulane', 'tulsa', 'navy', 'east-carolina', 'temple',
          'usf', 'cincinnati', 'houston', 'ucf', 'smu', 'uconn',
        ],
        'mountain-west': [
          'air-force', 'boise-state', 'colorado-state', 'fresno-state', 'hawaii',
          'nevada', 'new-mexico', 'san-diego-state', 'san-jose-state', 'unlv',
          'utah-state', 'wyoming',
        ],
        // CUSA 2014 — 13 members
        'cusa': [
          'florida-atlantic', 'fiu', 'marshall', 'middle-tennessee', 'old-dominion',
          'uab', 'western-kentucky', 'louisiana-tech', 'north-texas', 'rice',
          'southern-miss', 'utep', 'utsa',
        ],
        // Sun Belt 2014 — App State/Georgia Southern first FBS year
        'sun-belt': [
          'app-state', 'arkansas-state', 'georgia-southern', 'georgia-state',
          'louisiana', 'louisiana-monroe', 'south-alabama', 'troy', 'texas-state',
          'new-mexico-state',
        ],
        'mac': [
          'akron', 'ball-state', 'bowling-green', 'buffalo', 'central-michigan',
          'eastern-michigan', 'kent-state', 'miami-oh', 'northern-illinois',
          'ohio', 'toledo', 'western-michigan',
        ],
        'independent': ['notre-dame', 'byu', 'army', 'navy', 'liberty'],
      }, 2014),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 4 · 2003 — BIG EAST ERA
    //
    // The Big East at peak power: Miami, VT, BC still football members (leave
    // for ACC after 2003 season). Louisville was in CUSA football, not Big East.
    // Big 12 full 12. Big Ten 11 (Penn State joined 1993). SEC 12. Pac-10 at 10.
    // ACC 9 (pre-raid). MWC founded 1999 with 8 teams. WAC had 10 teams after
    // MWC split. CUSA had 10. Sun Belt FBS since 2001 with 6 teams (Idaho not in DB).
    // FAU and FIU were FBS independents (joined Sun Belt 2005).
    // UCF was in the MAC 2002-2004 before moving to CUSA.
    // Army was in CUSA 1999–2004.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'big-east-era-2003',
      name: '2003 — Big East Era',
      description: 'Big East at peak with Miami, VT & BC. Big 12 full 12. Pac-10 at 10. Boise State in WAC.',
      getConferences: () => buildFromSpec({
        // Big East football 2003 (10 teams; Louisville was in CUSA, not Big East)
        'big-east': [
          'miami', 'virginia-tech', 'boston-college', 'pitt', 'syracuse',
          'west-virginia', 'rutgers', 'temple', 'uconn', 'cincinnati',
        ],
        // Big 12 — all 12 members still intact
        'big-12': [
          'colorado', 'iowa-state', 'kansas', 'kansas-state', 'missouri', 'nebraska',
          'texas', 'oklahoma', 'texas-am', 'oklahoma-state', 'texas-tech', 'baylor',
        ],
        // Big Ten 11 (Penn State joined 1993; no Maryland/Rutgers/Nebraska yet)
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'illinois', 'purdue', 'indiana', 'northwestern',
        ],
        // SEC 12 (Missouri and Texas A&M join in 2012)
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina',
          'vanderbilt', 'kentucky',
        ],
        // Pac-10 (Colorado/Utah join in 2011)
        'pac-12': [
          'usc', 'ucla', 'washington', 'washington-state', 'oregon', 'oregon-state',
          'california', 'stanford', 'arizona', 'arizona-state',
        ],
        // ACC 9 (Miami and VT join for 2004; BC for 2005)
        'acc': [
          'florida-state', 'clemson', 'duke', 'georgia-tech', 'maryland',
          'nc-state', 'north-carolina', 'virginia', 'wake-forest',
        ],
        // MWC — 8 founding members (TCU joins 2005; Utah leaves 2011)
        'mountain-west': [
          'air-force', 'byu', 'colorado-state', 'new-mexico',
          'san-diego-state', 'unlv', 'utah', 'wyoming',
        ],
        // WAC 2003 — 10 teams after MWC split (Boise State, Nevada, San Jose State, etc.)
        // Using 'aac' conf slot to display as "WAC"
        'aac': [
          'boise-state', 'fresno-state', 'hawaii', 'louisiana-tech',
          'nevada', 'san-jose-state', 'utah-state', 'tulsa',
        ],
        // MAC 2003 — Marshall (joined 1997), Buffalo (joined 1999), UCF (2002–2004)
        'mac': [
          'akron', 'ball-state', 'bowling-green', 'buffalo', 'central-michigan',
          'eastern-michigan', 'kent-state', 'marshall', 'miami-oh', 'northern-illinois',
          'ohio', 'toledo', 'ucf', 'western-michigan',
        ],
        // CUSA 2003 — 10 teams (Cincinnati in Big East; Houston/SMU/Rice listed here)
        // Louisville was CUSA football through 2004; TCU left for MWC 2001
        'cusa': [
          'east-carolina', 'houston', 'louisville', 'memphis',
          'rice', 'smu', 'southern-miss', 'tulane', 'uab', 'army',
        ],
        // Sun Belt 2003 — FBS since 2001; Idaho (not in DB) was also a member
        'sun-belt': [
          'arkansas-state', 'louisiana', 'louisiana-monroe',
          'middle-tennessee', 'north-texas', 'troy', 'new-mexico-state',
        ],
        // FBS Independents 2003
        // FAU (FBS 2001) and FIU (FBS 2002) joined Sun Belt in 2005
        'independent': [
          'notre-dame', 'navy', 'florida-atlantic', 'fiu',
        ],
      }, 2003),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 5 · 1992 — BIG 8 + SWC ERA
    //
    // Before the 1996 merger. Arkansas left SWC for SEC in 1991. SEC expanded
    // to 12 in 1992. Big Ten had 10 teams — Penn State's first season was 1993.
    // Florida State joined ACC in 1992. Big East football launched 1991.
    // Louisville was in Big East football as a founding member.
    // UConn was FCS (I-AA) until 2000 — not in Big East football 1992.
    // WAC had 10 members in 1992. Utah State was in the Big West, not the WAC.
    // MAC had 10 members (Buffalo 1999, Akron joined MAC 1992).
    // CUSA did not exist (founded 1995). Most G5/Sun Belt schools were FCS.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'big-8-swc-1992',
      name: '1992 — Big 8 + SWC Era',
      description: 'Before the 1996 Big 12 merger. Big 8 vs SWC. Big East loaded with Miami. SEC just hit 12.',
      getConferences: () => buildFromSpec({
        // Big Eight — 8 teams
        'big-8': [
          'colorado', 'iowa-state', 'kansas', 'kansas-state',
          'missouri', 'nebraska', 'oklahoma', 'oklahoma-state',
        ],
        // SWC — 8 teams (Arkansas left in 1991)
        'swc': [
          'baylor', 'houston', 'rice', 'smu',
          'tcu', 'texas', 'texas-am', 'texas-tech',
        ],
        // SEC 12 — first year with 12 teams (Arkansas + South Carolina joined 1992)
        'sec': [
          'alabama', 'arkansas', 'auburn', 'florida', 'georgia', 'kentucky',
          'lsu', 'mississippi-state', 'ole-miss', 'south-carolina',
          'tennessee', 'vanderbilt',
        ],
        // Big Ten — 10 teams; Penn State's first season is 1993, so they are independent here
        'big-ten': [
          'illinois', 'indiana', 'iowa', 'michigan', 'michigan-state',
          'minnesota', 'northwestern', 'ohio-state', 'purdue', 'wisconsin',
        ],
        // Pac-10 — exactly 10 (unchanged until Colorado/Utah in 2011)
        'pac-12': [
          'arizona', 'arizona-state', 'california', 'oregon', 'oregon-state',
          'stanford', 'usc', 'ucla', 'washington', 'washington-state',
        ],
        // ACC — 9 teams; Florida State's first season
        'acc': [
          'clemson', 'duke', 'florida-state', 'georgia-tech', 'maryland',
          'nc-state', 'north-carolina', 'virginia', 'wake-forest',
        ],
        // Big East football — 8 founding members (1991); Louisville was a founding member;
        // UConn was FCS in 1992 and did NOT play Big East football
        'big-east': [
          'boston-college', 'louisville', 'miami', 'pitt',
          'rutgers', 'syracuse', 'temple', 'virginia-tech', 'west-virginia',
        ],
        // WAC — 10 teams in 1992 (Fresno State joined as 10th in 1992)
        // Air Force was a WAC member. Utah State was in the Big West, not WAC.
        // Nevada joined WAC in 1992. San Jose State was a member.
        'mountain-west': [
          'air-force', 'byu', 'colorado-state', 'fresno-state', 'hawaii',
          'nevada', 'new-mexico', 'san-diego-state', 'san-jose-state',
          'utah', 'utep', 'wyoming',
        ],
        // MAC — 10 teams (Akron joined 1992; Buffalo joins 1999; Marshall joins 1997)
        'mac': [
          'akron', 'ball-state', 'bowling-green', 'central-michigan',
          'eastern-michigan', 'kent-state', 'miami-oh', 'northern-illinois',
          'ohio', 'toledo', 'western-michigan',
        ],
        // FBS Independents 1992
        // Penn State: last year as independent (joined Big Ten 1993)
        // Louisiana Tech: was in Big West Conference (I-A), displayed here
        // UAB: first I-A season was 1991 as independent
        // Tulane, Tulsa, East Carolina, Memphis, Southern Miss: I-A independents
        // Utah State: Big West Conference (I-A); displayed here for simplicity
        'independent': [
          'army', 'east-carolina', 'louisiana-tech', 'memphis',
          'navy', 'notre-dame', 'penn-state', 'southern-miss',
          'tulane', 'tulsa', 'uab', 'utah-state',
        ],
        // Explicit empty buckets for unused conference slots
        'sun-belt': [],
        'cusa': [],
        'aac': [],
      }, 1992),
    },

  ];
}
