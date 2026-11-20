// main.ts — the entrypoint. Node 22, standard library only.
//
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json there with the scorer's own buildDossier, under the
// scorer's caps, so the dossier handed in is byte-for-byte what the
// scorer would write from the same files.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory defaults to /output.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The scorer's caps for gta6-cover-art-01 (gate.json): the dossier text
// holds at most 160 KiB; at most 4 screenshots of at most 256 KiB each;
// app/ holds at most 993 entries and 48 MiB, no path over 1000 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const parsed = JSON.parse(new TextDecoder().decode(dossier));
const textBytes = Buffer.byteLength(parsed.text, 'utf8');
console.log(`dossier.json: ${dossier.byteLength} bytes`);
console.log(`dossier text: ${textBytes} bytes (cap ${CAPS.text_max_bytes})`);
console.log(`screenshots: ${parsed.images.length}`);
console.log(`wrote ${outDir}`);
