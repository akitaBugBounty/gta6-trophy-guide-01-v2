// The seven-stage platinum roadmap. Stage numbers match each trophy's
// `roadmapStage` field in app/data/trophies.json. Stage 0 holds no trophy
// — it is preparation before the run starts.

export const ROADMAP_STAGES = [
  {
    stage: 0,
    title: 'Stage 0 — Before you start',
    summary: 'Set up one clean run. Turn spoilers on, make a manual save at the start of every chapter (15 slots), and never use cheats on your trophy save — cheats disable trophies and saving on that save. One playthrough is enough.',
    warning: 'There is no mission replay and no New Game Plus.',
  },
  {
    stage: 1,
    title: 'Stage 1 — Story, Chapters 1–4',
    summary: 'Play the story from Gone Fishing through the final mission. In Chapter 1, do the balcony meditation with Lucia (Positive Mental Attitude) — it is the one trophy that can be missed. Keep a full manual save from before the final mission.',
    warning: 'Do the Chapter 1 balcony meditation before Chapter 1 ends.',
  },
  {
    stage: 2,
    title: 'Stage 2 — Partner unlock (Chapter 2+)',
    summary: 'From Chapter 2 you can switch between Jason and Lucia and call your partner in. Lose a 4-star wanted level together, rob three shops back-to-back together, and train Strength together until both partners are at maximum.',
    warning: 'Partner trophies need both characters — they open in Chapter 2.',
  },
  {
    stage: 3,
    title: 'Stage 3 — Side stories',
    summary: 'Finish the six side-story finales (Andy is Lucia-only; Billy, Tyrone and Bret are Jason-only; Kenton and Randy are either) and 8 Strangers & Freaks strands. Do the Race Against Yago strand in Chapter 3 as soon as it appears — it is time-sensitive.',
    warning: 'Race Against Yago (Chapter 3) is time-sensitive.',
  },
];

ROADMAP_STAGES.push(
  {
    stage: 4,
    title: 'Stage 4 — Robberies',
    summary: 'Jewelry stores open with the Snap Gun in Chapter 3 (Richardson Jewelry & Diamonds is a good first target). Bank vaults open near the end of Chapter 4 through the optional mission That\'s Where The Money Is — 5 vaults for the trophy, 8 for 100%. Then armored trucks, one illegal operation per gang, and three shops in a row.',
    warning: 'Bring your partner to bank vaults — the bags do not fit alone.',
  },
  {
    stage: 5,
    title: 'Stage 5 — Activities & collectibles grind',
    summary: 'The long grind: 250 stunts (300 for 100%), 42 Shooting Range golds, 14 drone race locations, 20 different race wins, 18 meditations, 3 card sets, 100 WAiNK spots, 50 Challenges, 100 vehicles discovered and 52 areas explored.',
    warning: 'Do not stop at 250 stunts — 100% completion needs 300.',
  },
  {
    stage: 6,
    title: 'Stage 6 — Money & misc',
    summary: 'Buy 8 garages (about $160,000), spend $100,000 across shops, launder $250,000 of marked bills, register 10 vehicles with Scooter Bros, fill the Criminal Profile to 500 actions, and mop up the combat and free-roam trophies — the tank, the VCIA jet, the bowling alley and the five trophies whose methods are not yet confirmed.',
    warning: 'Five trophies have no confirmed method at launch — this guide says so plainly instead of inventing steps.',
  },
  {
    stage: 7,
    title: 'Stage 7 — 100% + Platinum',
    summary: 'Open Progress, then Stats, then 100% Completion once the story is done, and chase the checklist numbers to 100% — that pops A Long Road (Gold), and the platinum follows the moment the 54th other trophy is earned.',
    warning: 'Only checklist numbers count for 100% — not every category maximum.',
  },
);

// How far a stage is: { done, total } of its trophies earned.
export function stageProgress(stage, trophies, earnedSet) {
  const members = trophies.filter((trophy) => trophy.roadmapStage === stage);
  const done = members.filter((trophy) => earnedSet.has(trophy.name)).length;
  return { done, total: members.length, members };
}

// Trophies of one stage, in official order.
export function trophiesForStage(stage, trophies) {
  return trophies
    .filter((trophy) => trophy.roadmapStage === stage)
    .sort((a, b) => a.id - b.id);
}
