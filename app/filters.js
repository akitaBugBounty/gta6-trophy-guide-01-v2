// Pure filter helpers for the trophy list. No DOM, no storage — easy to test.
// The list has no online trophies at launch, so the "online" kind always
// matches nothing on purpose; the UI explains that instead of hiding it.

export const KIND_LABELS = {
  story: 'Story',
  'side-story': 'Side story',
  collectibles: 'Collectibles',
  activities: 'Activities',
  robbery: 'Robbery',
  exploration: 'Exploration',
  combat: 'Combat',
  misc: 'Misc',
  platinum: 'Platinum',
};

// Does one trophy belong to a filter kind? The "misc" filter also catches
// exploration, combat and platinum trophies so no trophy is ever hidden
// from every kind filter.
export function matchesKind(trophy, kind) {
  if (kind === 'all') return true;
  if (kind === 'online') return false;
  if (kind === 'missable') return trophy.missable === true || trophy.atRisk === true;
  if (kind === 'misc') {
    return trophy.kind === 'misc' || trophy.kind === 'exploration' ||
      trophy.kind === 'combat' || trophy.kind === 'platinum';
  }
  return trophy.kind === kind;
}

export function matchesGrade(trophy, grade) {
  return grade === 'all' || trophy.grade === grade;
}

export function matchesStatus(trophy, status, earnedSet) {
  if (status === 'all') return true;
  if (status === 'earned') return earnedSet.has(trophy.name);
  if (status === 'not-earned') return !earnedSet.has(trophy.name);
  if (status === 'hidden') return trophy.hidden === true;
  return true;
}

export function matchesQuery(trophy, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  return trophy.name.toLowerCase().includes(needle) ||
    trophy.description.toLowerCase().includes(needle);
}

// With spoilers on, an unearned story trophy hides its name and description.
// The grade and kind stay visible so grade filters keep working.
export function spoilerMask(trophy, earnedSet, spoilerOn) {
  if (!spoilerOn) return null;
  if (trophy.kind !== 'story') return null;
  if (earnedSet.has(trophy.name)) return null;
  return {
    name: 'Hidden story trophy — earn it to reveal',
    description: 'Its name and description stay hidden until you earn it.',
  };
}

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

function sortTrophies(list, sort) {
  const copy = [...list];
  if (sort === 'grade') {
    copy.sort((a, b) => {
      const byGrade = GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade];
      return byGrade !== 0 ? byGrade : a.id - b.id;
    });
  } else if (sort === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    copy.sort((a, b) => a.id - b.id);
  }
  return copy;
}

// Apply every filter in one pass. `state` is { query, kind, grade,
// status, sort }; `earnedSet` is a Set of earned official names.
export function applyFilters(trophies, state, earnedSet) {
  const filtered = trophies.filter((trophy) => {
    return matchesQuery(trophy, state.query) &&
      matchesKind(trophy, state.kind) &&
      matchesGrade(trophy, state.grade) &&
      matchesStatus(trophy, state.status, earnedSet);
  });
  return sortTrophies(filtered, state.sort);
}

// Count earned trophies per grade for the header mini-counters.
export function gradeCounts(trophies, earnedSet) {
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const earned = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    totals[trophy.grade] += 1;
    if (earnedSet.has(trophy.name)) earned[trophy.grade] += 1;
  }
  return { totals, earned };
}
