// Leonida Trophy Ledger — UI entry point.
// Boots by fetching app/data/trophies.json, then renders the tracker,
// detail panel, roadmap and missables views. All rendering uses the DOM
// API (createElement / textContent) — never innerHTML with data.

import {
  loadProgress, saveProgress, toggleEarned, setSpoiler,
  exportProgress, importProgressFile, onProgressChange,
} from './store.js';
import { applyFilters, spoilerMask, gradeCounts } from './filters.js';
import { ROADMAP_STAGES, stageProgress, trophiesForStage } from './roadmap.js';

const $ = (id) => document.getElementById(id);

// Trophies whose method is not yet confirmed at launch — their guides say
// so plainly instead of inventing steps.
const UNCONFIRMED_IDS = new Set([44, 45, 49, 50, 51]);

let trophies = [];
let progress = loadProgress();
let selectedId = null;

const state = { query: '', kind: 'all', grade: 'all', status: 'all', sort: 'default' };

function earnedSet() {
  return new Set(progress.earned);
}

function officialNames() {
  return trophies.map((trophy) => trophy.name);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function gradeLetter(grade) {
  return { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' }[grade] || '?';
}

function kindLabel(kind) {
  return { story: 'Story', 'side-story': 'Side story', collectibles: 'Collectibles',
    activities: 'Activities', robbery: 'Robbery', exploration: 'Exploration',
    combat: 'Combat', misc: 'Misc', platinum: 'Platinum' }[kind] || kind;
}

// --- Header progress -------------------------------------------------------

function renderHeader() {
  const earned = earnedSet();
  const { totals, earned: perGrade } = gradeCounts(trophies, earned);
  $('earned-count').textContent = `${earned.size} / ${trophies.length} earned`;
  $('earned-pct').textContent = `${Math.round((earned.size / trophies.length) * 100)}%`;
  $('progress-fill').style.width = `${(earned.size / trophies.length) * 100}%`;
  $('progress-bar').setAttribute('aria-valuenow', String(earned.size));
  $('counter-p').textContent = `P ${perGrade.platinum}/${totals.platinum}`;
  $('counter-g').textContent = `G ${perGrade.gold}/${totals.gold}`;
  $('counter-s').textContent = `S ${perGrade.silver}/${totals.silver}`;
  $('counter-b').textContent = `B ${perGrade.bronze}/${totals.bronze}`;
}

// --- Tabs ------------------------------------------------------------------

const VIEWS = ['tracker', 'roadmap', 'missables'];

function setView(view) {
  const current = VIEWS.includes(view) ? view : 'tracker';
  for (const name of VIEWS) {
    $(`view-${name}`).hidden = name !== current;
    $(`tab-${name}`).classList.toggle('active', name === current);
  }
  if (window.location.hash !== `#${current}`) {
    window.history.replaceState(null, '', `#${current}`);
  }
}

function viewFromHash() {
  const hash = window.location.hash.replace('#', '');
  return VIEWS.includes(hash) ? hash : 'tracker';
}

// --- Screenshot scenes -----------------------------------------------------
// ?shot=cover|guide|roadmap|spoiler sets up one of the four screenshot
// scenes, then the app marks itself ready for the screenshot tool.

function applyShotParam() {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!shot) return null;
  if (shot === 'guide') {
    selectedId = 28;
    setView('tracker');
  } else if (shot === 'roadmap') {
    setView('roadmap');
  } else if (shot === 'spoiler') {
    progress = setSpoiler(progress, true);
    $('spoiler-toggle').checked = true;
    setView('tracker');
  } else {
    setView('tracker');
  }
  return shot;
}

// --- Trophy list -----------------------------------------------------------

function renderList() {
  const list = $('trophy-list');
  list.replaceChildren();
  const earned = earnedSet();
  const shown = applyFilters(trophies, state, earned);
  $('showing-count').textContent = `Showing ${shown.length} of ${trophies.length}`;
  $('online-note').hidden = state.kind !== 'online';

  if (shown.length === 0) {
    const empty = el('li', 'empty-list', state.kind === 'online'
      ? 'No online trophies at launch — every one of the 55 is single-player.'
      : 'No trophies match these filters. Clear the search or pick another kind.');
    list.appendChild(empty);
    return;
  }

  for (const trophy of shown) {
    const mask = spoilerMask(trophy, earned, progress.spoiler);
    const row = el('li', 'trophy-row');
    if (earned.has(trophy.name)) row.classList.add('earned');
    if (trophy.id === selectedId) row.classList.add('selected');
    row.addEventListener('click', () => selectTrophy(trophy.id));

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'trophy-check';
    check.checked = earned.has(trophy.name);
    check.setAttribute('aria-label', `Mark ${mask ? 'hidden story trophy' : trophy.name} earned`);
    check.addEventListener('click', (event) => event.stopPropagation());
    check.addEventListener('change', () => {
      progress = toggleEarned(progress, trophy.name);
    });
    row.appendChild(check);

    const main = el('div', 'trophy-main');
    const name = el('p', 'trophy-name', mask ? mask.name : trophy.name);
    if (mask) name.classList.add('spoiler-hidden-name');
    const desc = el('p', 'trophy-desc', mask ? mask.description : trophy.description);
    if (mask) desc.classList.add('spoiler-hidden-desc');
    main.appendChild(name);
    main.appendChild(desc);

    const meta = el('div', 'trophy-meta');
    meta.appendChild(el('span', `badge grade-${trophy.grade}`, `${gradeLetter(trophy.grade)} · ${trophy.grade}`));
    meta.appendChild(el('span', 'badge kind', kindLabel(trophy.kind)));
    if (trophy.hidden) meta.appendChild(el('span', 'badge hidden-badge', 'Hidden'));
    if (trophy.missable) meta.appendChild(el('span', 'badge missable-badge', 'Missable'));
    if (trophy.atRisk) meta.appendChild(el('span', 'badge atrisk-badge', 'At risk'));
    if (UNCONFIRMED_IDS.has(trophy.id)) meta.appendChild(el('span', 'badge unconfirmed-badge', 'Method unconfirmed'));
    main.appendChild(meta);

    if (trophy.count !== null && trophy.countUnit) {
      main.appendChild(el('div', 'trophy-count', `Progress target: 0 / ${trophy.count.toLocaleString('en-US')} ${trophy.countUnit}`));
    }
    row.appendChild(main);
    list.appendChild(row);
  }
}

// --- Detail panel ----------------------------------------------------------

function renderDetail() {
  const panel = $('detail-panel');
  panel.replaceChildren();
  const trophy = trophies.find((item) => item.id === selectedId);
  if (!trophy) {
    panel.appendChild(el('p', 'detail-empty', 'Select a trophy to read its guide, sources and roadmap stage.'));
    return;
  }
  const earned = earnedSet();
  const isEarned = earned.has(trophy.name);

  panel.appendChild(el('h3', null, trophy.name));
  panel.appendChild(el('p', 'detail-desc', trophy.description));
  const meta = el('div', 'trophy-meta');
  meta.appendChild(el('span', `badge grade-${trophy.grade}`, `${gradeLetter(trophy.grade)} · ${trophy.grade}`));
  meta.appendChild(el('span', 'badge kind', kindLabel(trophy.kind)));
  if (trophy.hidden) meta.appendChild(el('span', 'badge hidden-badge', 'Hidden'));
  if (trophy.missable) meta.appendChild(el('span', 'badge missable-badge', 'Missable'));
  if (trophy.atRisk) meta.appendChild(el('span', 'badge atrisk-badge', 'At risk'));
  panel.appendChild(meta);
  if (trophy.count !== null && trophy.countUnit) {
    panel.appendChild(el('p', 'trophy-count', `PlayStation tracks: 0 / ${trophy.count.toLocaleString('en-US')} ${trophy.countUnit}`));
  }

  if (trophy.missable && trophy.missableNote) {
    const warn = el('div', 'detail-missable');
    warn.appendChild(el('strong', null, 'Missable — '));
    warn.appendChild(document.createTextNode(trophy.missableNote));
    panel.appendChild(warn);
  }
  if (trophy.atRisk && trophy.missableNote) {
    const warn = el('div', 'detail-missable');
    warn.appendChild(el('strong', null, 'At risk — '));
    warn.appendChild(document.createTextNode(trophy.missableNote));
    panel.appendChild(warn);
  }
  if (UNCONFIRMED_IDS.has(trophy.id)) {
    const note = el('div', 'detail-unconfirmed');
    note.appendChild(el('strong', null, 'Method not yet confirmed at launch. '));
    note.appendChild(document.createTextNode('This guide says so plainly instead of inventing steps.'));
    panel.appendChild(note);
  }

  panel.appendChild(el('p', 'detail-label', 'Guide'));
  const guide = el('div', 'detail-guide');
  guide.appendChild(el('p', null, trophy.guide));
  panel.appendChild(guide);

  panel.appendChild(el('p', 'detail-label', 'Sources'));
  const sources = el('ul', 'detail-sources');
  for (const source of trophy.sources) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.rel = 'noopener';
    link.textContent = source.name;
    item.appendChild(link);
    sources.appendChild(item);
  }
  panel.appendChild(sources);

  const stage = ROADMAP_STAGES[trophy.roadmapStage];
  panel.appendChild(el('p', 'detail-label', 'Roadmap stage'));
  panel.appendChild(el('p', null, stage ? stage.title : `Stage ${trophy.roadmapStage}`));

  const mark = el('button', null, isEarned ? 'Mark as not earned' : 'Mark earned');
  mark.className = 'detail-mark';
  mark.addEventListener('click', () => {
    progress = toggleEarned(progress, trophy.name);
  });
  panel.appendChild(mark);
}

function selectTrophy(id) {
  selectedId = id;
  renderList();
  renderDetail();
}

// --- Roadmap view ----------------------------------------------------------

function renderRoadmap() {
  const list = $('roadmap-list');
  list.replaceChildren();
  const earned = earnedSet();
  for (const stage of ROADMAP_STAGES) {
    const item = el('li', 'roadmap-stage');
    item.appendChild(el('h3', null, stage.title));
    item.appendChild(el('p', null, stage.summary));
    const progress = stageProgress(stage.stage, trophies, earned);
    if (progress.total > 0) {
      item.appendChild(el('p', 'stage-progress', `Stage progress: ${progress.done} / ${progress.total} earned`));
      const names = el('ul', 'stage-trophies');
      for (const trophy of trophiesForStage(stage.stage, trophies)) {
        const chip = el('li', null, trophy.name);
        if (earned.has(trophy.name)) chip.classList.add('done');
        chip.addEventListener('click', () => {
          selectTrophy(trophy.id);
          setView('tracker');
        });
        names.appendChild(chip);
      }
      item.appendChild(names);
    }
    if (stage.warning) {
      const warn = el('p', null, '');
      warn.appendChild(el('strong', null, 'Watch out: '));
      warn.appendChild(document.createTextNode(stage.warning));
      item.appendChild(warn);
    }
    list.appendChild(item);
  }
}

// --- Missables view --------------------------------------------------------

function renderMissables() {
  const wrap = $('missable-cards');
  wrap.replaceChildren();
  const missable = trophies.filter((trophy) => trophy.missable);
  const atRisk = trophies.filter((trophy) => trophy.atRisk);
  for (const trophy of [...missable, ...atRisk]) {
    const card = el('div', 'missable-card');
    if (trophy.atRisk && !trophy.missable) card.classList.add('atrisk');
    card.appendChild(el('h3', null, trophy.name));
    card.appendChild(el('p', null, trophy.missable ? 'MISSABLE' : 'AT RISK — time-sensitive'));
    card.appendChild(el('p', null, trophy.missableNote || trophy.guide));
    const open = el('button', null, 'Open its guide');
    open.addEventListener('click', () => {
      selectTrophy(trophy.id);
      setView('tracker');
    });
    card.appendChild(open);
    wrap.appendChild(card);
  }
}

function renderAll() {
  renderHeader();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

// --- Wiring ----------------------------------------------------------------

function wireEvents() {
  $('search-input').addEventListener('input', (event) => {
    state.query = event.target.value;
    renderList();
  });
  $('filter-kind').addEventListener('change', (event) => {
    state.kind = event.target.value;
    renderList();
  });
  $('filter-grade').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderList();
  });
  $('filter-status').addEventListener('change', (event) => {
    state.status = event.target.value;
    renderList();
  });
  $('sort-select').addEventListener('change', (event) => {
    state.sort = event.target.value;
    renderList();
  });

  for (const name of VIEWS) {
    $(`tab-${name}`).addEventListener('click', (event) => {
      event.preventDefault();
      setView(name);
    });
  }
  window.addEventListener('hashchange', () => setView(viewFromHash()));

  $('spoiler-toggle').checked = progress.spoiler;
  $('spoiler-toggle').addEventListener('change', (event) => {
    progress = setSpoiler(progress, event.target.checked);
  });

  $('btn-export').addEventListener('click', () => {
    exportProgress(progress);
    $('data-note').textContent = 'Progress exported as a JSON file.';
  });
  $('btn-import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { progress: imported, ignored } = await importProgressFile(file, officialNames());
      progress = saveProgress(imported) || imported;
      $('data-note').textContent = ignored > 0
        ? `Imported progress. ${ignored} unknown name${ignored === 1 ? '' : 's'} were ignored.`
        : 'Progress imported.';
      renderAll();
    } catch (err) {
      $('data-note').textContent = err.message || 'Could not import that file.';
    }
  });
  $('btn-reset').addEventListener('click', () => {
    if (!window.confirm('Reset all progress? This clears every earned trophy.')) return;
    progress = saveProgress({ earned: [], spoiler: progress.spoiler, updatedAt: new Date().toISOString() }) || progress;
    selectedId = null;
    $('data-note').textContent = 'Progress reset.';
    renderAll();
  });

  onProgressChange((next) => {
    progress = next;
    renderAll();
  });
}

// --- Boot ------------------------------------------------------------------

async function boot() {
  wireEvents();
  setView(viewFromHash());
  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    trophies = Array.isArray(data) ? data : data.trophies;
    if (!Array.isArray(trophies) || trophies.length === 0) throw new Error('Empty trophy list.');
    $('loading').hidden = true;
    const shot = applyShotParam();
    renderAll();
    if (shot) window.__shotReady = true;
  } catch (err) {
    $('loading-error').hidden = false;
  }
}

boot();
