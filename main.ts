// Leonida Trophy Ledger — entry program (Node 22, standard library only).
// Copies app/ and screenshots/ from this repository into the output
// directory, then writes /output/dossier.json with buildDossier from the
// kit's library (vendor/makefun-frontend.ts, unchanged).
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { buildDossier } from './vendor/makefun-frontend.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The dossier caps come from the competition's gate: at most 160 KiB of
// dossier text, at most 4 screenshots of 256 KiB each, app/ at most 993
// entries and 48 MiB in all.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function copyTree(source, target) {
  if (!existsSync(source)) {
    throw new Error(`main.ts: missing ${source} — the repository must hold app/ and screenshots/`);
  }
  cpSync(source, target, { recursive: true });
}

function countFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    count += statSync(path).isDirectory() ? countFiles(path) : 1;
  }
  return count;
}

function main() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  copyTree(join(repoRoot, 'app'), join(outDir, 'app'));
  copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  const appFiles = countFiles(join(outDir, 'app'));
  const shotFiles = countFiles(join(outDir, 'screenshots'));
  console.log(`main.ts: copied ${appFiles} app files and ${shotFiles} screenshots`);
  console.log(`main.ts: wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
}

main();
