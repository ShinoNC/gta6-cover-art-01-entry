// Sunset Vice - Cover Studio: the entrypoint.
//
// Hands the app in: copies app/ and screenshots/ from this repository
// into the output directory, then writes /output/dossier.json with
// buildDossier from the kit's vendor/makefun-app.ts. Node 22, standard
// library only. The run is deterministic: the same repository always
// writes the same bytes.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The gate caps for gta6-cover-art-01: the dossier text cap (160 KiB),
// at most 4 screenshots of 256 KiB each, and the app/ size limits.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function copyTree(name: string): void {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error(`Sunset Vice: missing ${name}/ in ${repoRoot}`);
  cpSync(src, join(outDir, name), { recursive: true });
}

function main(): void {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  copyTree('app');
  copyTree('screenshots');
  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

main();
