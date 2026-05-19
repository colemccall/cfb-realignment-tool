/**
 * presets.js — Conference Realignment Simulator
 *
 * Five presets spanning 30+ years of CFB realignment history.
 * Conference memberships are historically accurate for the labeled era.
 * FBS transition notes: App State/Troy/Sun Belt schools joined FBS 2005-2012;
 * Charlotte/Old Dominion/Georgia State joined FBS 2013-2016;
 * James Madison joined FBS 2022; Sam Houston/Jacksonville State/Kennesaw State
 * joined FBS 2022-2023.
 */

export function getPresets(ALL_TEAMS, ALL_CONFERENCES) {

  /**
   * Build a full conference map from a spec.
   * Teams listed in spec are placed as specified.
   * Teams NOT listed fall through to their teams.json default.
   * First occurrence wins if a team appears in multiple spec arrays.
   */
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
    // The Pac-12 brand revived: Oregon State and Washington State anchor the
    // new conference with schools from the Mountain West. Membership announced
    // late 2024: OSU, WSU + Boise State, Colorado State, Fresno State, Utah
    // State, San Diego State, Nevada, Nevada Las Vegas, and Wyoming.
    // The rump MWC continues with Air Force, New Mexico, San Jose State, Hawaii.
    // Big Ten (18), SEC (16), Big 12 (16), ACC (17) all unchanged from 2024.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'new-pac-12-2026',
      name: '2026 — New Pac-12',
      description: 'Pac-12 reborn with OSU, WSU + 8 Mountain West defectors. Big Ten 18, SEC 16, ACC 17 intact.',
      getConferences: () => buildFromSpec({
        'pac-12': [
          'oregon-state', 'washington-state',
          'boise-state', 'colorado-state', 'fresno-state', 'utah-state',
          'san-diego-state', 'unlv', 'nevada', 'wyoming',
        ],
        'mountain-west': ['air-force', 'new-mexico', 'san-jose-state', 'hawaii'],
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
          'texas-tech', 'tcu', 'baylor', 'oklahoma-state', 'kansas', 'kansas-state',
          'west-virginia', 'iowa-state', 'cincinnati', 'houston', 'ucf', 'byu',
          'colorado', 'arizona', 'arizona-state', 'utah',
        ],
        'acc': [
          'clemson', 'florida-state', 'miami', 'louisville', 'nc-state',
          'north-carolina', 'duke', 'wake-forest', 'virginia', 'virginia-tech',
          'boston-college', 'pitt', 'syracuse', 'georgia-tech',
          'stanford', 'california', 'smu',
        ],
      }),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 2 · 2024-25 — FALL OF THE PAC-12
    //
    // The great implosion. Oregon, USC, UCLA, Washington join Big Ten (18).
    // Texas and Oklahoma finally arrive in the SEC (16). Colorado, Arizona,
    // Arizona State, Utah bolt to Big 12 (16). Stanford, Cal, SMU join ACC (17).
    // Oregon State and Washington State are left holding an empty Pac-12 shell,
    // operating as a two-team conference while negotiating a future.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'chaos-2024',
      name: '2024-25 — Fall of the Pac-12',
      description: 'Pac-12 gutted to OSU + WSU. Big Ten 18, SEC 16, Big 12 16, ACC 17 take shape.',
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
          'texas-tech', 'tcu', 'baylor', 'oklahoma-state', 'kansas', 'kansas-state',
          'west-virginia', 'iowa-state', 'cincinnati', 'houston', 'ucf', 'byu',
          'colorado', 'arizona', 'arizona-state', 'utah',
        ],
        'acc': [
          'clemson', 'florida-state', 'miami', 'louisville', 'nc-state',
          'north-carolina', 'duke', 'wake-forest', 'virginia', 'virginia-tech',
          'boston-college', 'pitt', 'syracuse', 'georgia-tech',
          'stanford', 'california', 'smu',
        ],
        'mountain-west': [
          'boise-state', 'fresno-state', 'utah-state', 'unlv', 'colorado-state',
          'air-force', 'san-diego-state', 'nevada', 'new-mexico', 'wyoming',
          'san-jose-state', 'hawaii',
        ],
        'independent': ['notre-dame', 'liberty', 'uconn', 'new-mexico-state', 'temple'],
        // AAC (post-Big 12 raid) — lost Cincy/Houston/UCF/BYU in 2023; Temple expelled 2024
        'aac': [
          'memphis', 'tulane', 'tulsa', 'navy', 'army', 'east-carolina',
          'usf', 'charlotte', 'north-texas', 'uab', 'rice', 'utsa', 'florida-atlantic',
        ],
      }),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 3 · 2012–2023 — THE MODERN ERA
    //
    // The post-first-wave "stability" period. The 2010–2012 wave moved Nebraska
    // and Penn State-era Maryland/Rutgers to Big Ten (14 by 2014). Missouri and
    // Texas A&M bolted to the SEC (14 by 2012). Colorado and Utah escaped to
    // Pac-12 (12). The Big 12 shrank to 10 and held. Texas and Oklahoma stayed.
    // The ACC raided the Big East in 2013: Pitt, Syracuse (2013), Louisville (2014).
    // The Big East collapsed entirely in 2013, spawning the AAC.
    // Cincinnati, Houston, UCF join Big 12 in 2023. BYU goes independent in 2011,
    // then joins Big 12 in 2023 along with UCF, Cincinnati, Houston.
    // For clarity this represents 2014–2022.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'modern-era-2014',
      name: '2014–2022 — The Modern Era',
      description: 'The long stable stretch: Pac-12 at 12, Big 12 at 10 (TX+OU still there), SEC/Big Ten at 14, ACC at 14.',
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
        // AAC (rebranded from Big East 2013): football-only remnant
        'aac': [
          'memphis', 'tulane', 'tulsa', 'navy', 'east-carolina', 'temple',
          'usf', 'cincinnati', 'houston', 'ucf', 'smu',
          'army', 'uconn', // Army joined AAC 2016, UConn left 2020 but was member
        ],
        'mountain-west': [
          'boise-state', 'fresno-state', 'utah-state', 'unlv', 'colorado-state',
          'air-force', 'san-diego-state', 'nevada', 'new-mexico', 'wyoming',
          'san-jose-state', 'hawaii',
        ],
        // Sun Belt fully FBS by this era
        'sun-belt': [
          'app-state', 'georgia-southern', 'georgia-state', 'louisiana',
          'louisiana-monroe', 'south-alabama', 'arkansas-state', 'troy',
          'texas-state',
        ],
        // CUSA in this era
        'cusa': [
          'marshall', 'old-dominion', 'southern-miss', 'utep', 'louisiana-tech',
          'middle-tennessee', 'western-kentucky', 'fiu', 'florida-atlantic',
          'rice', 'utsa', 'north-texas', 'uab', 'charlotte',
        ],
        'independent': ['notre-dame', 'byu', 'liberty', 'new-mexico-state'],
      }, 2014),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 4 · 2003–2011 — BIG EAST ERA
    //
    // The Big East in its power-conference prime. Miami, VT, and BC were members
    // before the ACC raided the conference in 2004-05. The Big 12 had all 12.
    // Big Ten had only 11 (Penn State, no Nebraska/Maryland/Rutgers). SEC at 12
    // (no Missouri/Texas A&M). Pac-10 at 10 (no Utah/Colorado/Oregon additions).
    // ACC had 9 original members + FSU (1992) before raiding Big East in 2004.
    // Miami/VT joined ACC in 2004, BC in 2005. This snapshot is ~2003 pre-raid.
    // WAC: Boise State (1996–2011), Hawaii, Fresno State, Utah State, Nevada,
    // San Jose State, Louisiana Tech. MWC formed 1999: BYU, Utah, Air Force,
    // Colorado State, UNLV, Wyoming, New Mexico, San Diego State, TCU (2005).
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'big-east-era-2003',
      name: '2003 — Big East Era',
      description: 'Big East as a Power conference with Miami, VT & BC. Old Big 12 at 12. Pac-10 at 10. Boise State in WAC.',
      getConferences: () => buildFromSpec({
        // Big East football 2003: Miami/VT/BC leave after season; Louisville was in CUSA
        'big-east': [
          'miami', 'virginia-tech', 'boston-college',
          'pitt', 'syracuse', 'west-virginia', 'rutgers',
          'temple', 'uconn', 'cincinnati',
        ],
        // Big 12 full 12: North (Nebraska, Colorado, Missouri, Kansas, K-State, Iowa State)
        //                  South (Texas, Oklahoma, Texas A&M, Oklahoma State, Texas Tech, Baylor)
        'big-12': [
          'nebraska', 'colorado', 'missouri', 'kansas', 'kansas-state', 'iowa-state',
          'texas', 'oklahoma', 'texas-am', 'oklahoma-state', 'texas-tech', 'baylor',
        ],
        // Big Ten 11 (Penn State joined 1993; no Nebraska/Maryland/Rutgers yet)
        'big-ten': [
          'ohio-state', 'michigan', 'penn-state', 'michigan-state', 'wisconsin',
          'iowa', 'minnesota', 'illinois', 'purdue', 'indiana', 'northwestern',
        ],
        // SEC 12 (Arkansas + South Carolina joined 1992; no Missouri/Texas A&M)
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina', 'vanderbilt', 'kentucky',
        ],
        // Pac-10: original 8 + Arizona/ASU (1978) + no Utah/Colorado yet
        'pac-12': [
          'usc', 'ucla', 'stanford', 'california', 'oregon', 'oregon-state',
          'washington', 'washington-state', 'arizona', 'arizona-state',
        ],
        // ACC 9 pre-Miami/VT/BC raid: FSU + original 8 (Clemson, Duke, Georgia Tech, Maryland,
        // NC State, North Carolina, Virginia, Wake Forest)
        'acc': [
          'florida-state', 'clemson', 'duke', 'georgia-tech', 'maryland',
          'nc-state', 'north-carolina', 'virginia', 'wake-forest',
        ],
        // Mountain West (formed 1999 — split from WAC):
        // BYU, Utah, Colorado State, Air Force, UNLV, Wyoming, New Mexico, San Diego State
        // Fresno State joined MWC 2012; was in WAC during this era
        'mountain-west': [
          'byu', 'utah', 'colorado-state', 'air-force', 'unlv', 'wyoming',
          'new-mexico', 'san-diego-state',
        ],
        // WAC (Western Athletic Conference) in this era
        'aac': [
          'boise-state', 'fresno-state', 'nevada', 'san-jose-state', 'hawaii',
          'utah-state', 'louisiana-tech',
          // CUSA schools (approximate)
          'memphis', 'tulane', 'tulsa', 'east-carolina', 'usf',
          'southern-miss', 'marshall', 'utep',
          // TCU was in CUSA 2001-2005 before jumping to MWC
          'tcu', 'smu', 'rice', 'houston',
        ],
        // MAC unchanged
        'mac': [
          'ohio', 'miami-oh', 'bowling-green', 'ball-state', 'buffalo', 'akron',
          'kent-state', 'western-michigan', 'central-michigan', 'eastern-michigan',
          'northern-illinois', 'toledo',
        ],
        // Sun Belt 2003 — only schools actually FBS and in Sun Belt
        // FAU was independent (joined Sun Belt 2005); FIU was independent (joined Sun Belt 2005)
        'sun-belt': [
          'louisiana', 'louisiana-monroe', 'arkansas-state', 'troy',
          'north-texas', 'middle-tennessee',
        ],
        // CUSA 2003 actual members
        'cusa': [
          'uab', 'southern-miss', 'utep', 'rice', 'memphis', 'tulane', 'houston', 'smu',
          'louisville', // Louisville was in CUSA for football through 2004
        ],
        // FBS independents 2003
        'independent': [
          'notre-dame', 'army', 'navy', 'new-mexico-state',
          'florida-atlantic', // FBS 2001, joined Sun Belt 2005
          'fiu',              // FBS 2002, joined Sun Belt 2005
        ],
      }, 2003),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 5 · 1992 — BIG 8 + SWC ERA
    //
    // Before the 1996 merger that created the Big 12. The Big Eight and Southwest
    // Conference were fierce rivals and separate entities. Arkansas left the SWC
    // for the SEC in 1991. South Carolina joined the SEC in 1991. The SEC expanded
    // to 12 in 1992 (adding Arkansas and South Carolina). Penn State joined the
    // Big Ten in 1993 (so Big Ten had 10 teams in 1992, technically). Florida State
    // joined the ACC in 1992. Miami was the nation's most dominant program and
    // was in the Big East. The WAC had 10 teams including Utah/BYU/Air Force.
    //
    // Note: Most Sun Belt and G5 schools were FCS (I-AA) in 1992. Only
    // schools actually at Division I-A (FBS equivalent) in 1992 are shown.
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'big-8-swc-1992',
      name: '1992 — Big 8 + SWC Era',
      description: 'Before the 1996 Big 12 merger. Big Eight vs. SWC. Big East loaded with Miami. SEC just hit 12.',
      getConferences: () => buildFromSpec({
        // Big Eight — the 8 teams, Oklahoma dominant era
        'big-8': [
          'oklahoma', 'nebraska', 'colorado', 'missouri',
          'kansas', 'kansas-state', 'iowa-state', 'oklahoma-state',
        ],
        // SWC — 8 teams after Arkansas left in 1991
        // Rice, TCU, SMU, Houston were all struggling members post-death penalty
        'swc': [
          'texas', 'texas-am', 'texas-tech', 'baylor',
          'tcu', 'rice', 'smu', 'houston',
        ],
        // SEC 12 — just expanded; Arkansas (1991) and South Carolina (1991)
        'sec': [
          'alabama', 'auburn', 'georgia', 'florida', 'tennessee', 'lsu',
          'ole-miss', 'mississippi-state', 'arkansas', 'south-carolina',
          'vanderbilt', 'kentucky',
        ],
        // Big Ten 10 in 1992 — Penn State's first season was 1993; they were independent in 1992
        'big-ten': [
          'michigan', 'ohio-state', 'michigan-state',
          'iowa', 'minnesota', 'wisconsin', 'illinois', 'purdue',
          'indiana', 'northwestern',
        ],
        // Pac-10 — exactly 10, stable from 1978 until Utah/Colorado in 2011
        'pac-12': [
          'usc', 'ucla', 'stanford', 'california', 'oregon', 'oregon-state',
          'washington', 'washington-state', 'arizona', 'arizona-state',
        ],
        // ACC 9 — Florida State joined in 1992 as 9th member
        'acc': [
          'florida-state', 'clemson', 'georgia-tech', 'maryland',
          'duke', 'nc-state', 'north-carolina', 'virginia', 'wake-forest',
        ],
        // Big East football 1992 — UConn was still FCS (I-AA) until 2000
        'big-east': [
          'miami', 'virginia-tech', 'west-virginia', 'pitt',
          'boston-college', 'syracuse', 'rutgers', 'temple',
          'louisville',
        ],
        // WAC 1992 — Utah State was in Big West, not WAC in 1992
        'mountain-west': [
          'byu', 'utah', 'wyoming', 'air-force', 'colorado-state', 'unlv',
          'new-mexico', 'san-diego-state', 'hawaii', 'fresno-state',
          'san-jose-state', 'nevada', 'utep',
        ],
        // MAC — fully FBS in 1992
        'mac': [
          'ohio', 'miami-oh', 'bowling-green', 'ball-state',
          'kent-state', 'western-michigan', 'central-michigan', 'eastern-michigan',
          'northern-illinois', 'toledo',
          // Buffalo joined MAC in 1999; Akron joined MAC in 1992
          'akron',
        ],
        // FBS Independents 1992
        'independent': [
          'notre-dame', 'penn-state', // Penn State's first Big Ten season was 1993
          'army', 'navy',
          'tulane', 'tulsa', 'east-carolina',
          'louisiana-tech', 'uab', 'southern-miss', 'memphis',
          'utah-state', // was in Big West; treated as misc independent here
        ],
        // Sun Belt was FCS (I-AA) in 1992 — all three route to FCS via eraYear filter
        // (fbs_since set on each: louisiana has none so stays here as placeholder)
        // Louisiana/ULM/Ark State were I-AA Sun Belt; eraYear filter handles them if fbs_since set
        'sun-belt': [],
        // placeholder — no CUSA in 1992
        'cusa': [],
      }, 1992),
    },

  ];
}
