#!/usr/bin/env node
/**
 * Scans the upstream outputs/unitoken/ directory and produces:
 *   - lib/tree-data.generated.ts  (imported by the app at build time)
 *   - public/data/unitoken/        (symlink in dev, copy in CI)
 *
 * Inputs (env vars):
 *   OUTPUTS_DIR        absolute path to the outputs root (default: ../outputs)
 *   STAGE_MODE         "symlink" | "copy" (default: copy in CI, symlink locally)
 *
 * The manifest mirrors the on-disk layout:
 *
 *   concept/
 *     elastic_band/strength_*.png + summary.json
 *     inference/<regime>/<dimension>/<value>/<token_mode>/L0_a*.png + grid.png
 *
 * where regime ∈ {prompt-only, every-step}, dimension ∈ {cfg, temp, top_k},
 * value is the literal subdir name (e.g. cfg_3, temp_1_0, top_k_4000),
 * token_mode ∈ {localized, broadcast}.
 */

import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');

const outputsDir = process.env.OUTPUTS_DIR
  ? path.resolve(process.env.OUTPUTS_DIR)
  : path.join(repoRoot, 'outputs');
const unitokenDir = path.join(outputsDir, 'unitoken');

const stageMode =
  process.env.STAGE_MODE ?? (process.env.CI ? 'copy' : 'symlink');

const publicDataDir = path.join(appRoot, 'public', 'data');
const stagedDir = path.join(publicDataDir, 'unitoken');
const manifestPath = path.join(appRoot, 'lib', 'tree-data.generated.ts');

// --- helpers ---------------------------------------------------------------

async function readdirSafe(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/** Parse a strength filename like "L0_a+0.400.png" or "L0_a-1.000.png". */
function parseInferenceFilename(name) {
  const m = name.match(/^L(\d+)_a([+-]?\d+(?:\.\d+)?)\.png$/);
  if (!m) return null;
  return { layer: Number(m[1]), strength: Number(m[2]) };
}

/** Parse "strength_+0.000000.png" / "strength_-0.100000.png". */
function parseElasticFilename(name) {
  const m = name.match(/^strength_([+-]?\d+(?:\.\d+)?)\.png$/);
  if (!m) return null;
  return { strength: Number(m[1]) };
}

/** Parse a sweep-value subdir name like "cfg_3", "temp_1_0", "top_k_4000". */
function parseSweepValue(dimension, name) {
  const prefix = { cfg: 'cfg_', temp: 'temp_', top_k: 'top_k_' }[dimension];
  if (!prefix || !name.startsWith(prefix)) return null;
  const raw = name.slice(prefix.length);
  // temp uses underscore for decimal: temp_1_0 → 1.0, temp_0_01 → 0.01
  if (dimension === 'temp') {
    const parts = raw.split('_');
    const num = Number(parts.join('.'));
    return Number.isFinite(num) ? num : null;
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

const SWEEP_DIMENSIONS = ['cfg', 'temp', 'top_k'];
const REGIMES = ['prompt-only', 'every-step'];
const TOKEN_MODES = ['localized', 'broadcast'];

function relUrl(...parts) {
  // posix-style for URLs
  return path.posix.join('data', 'unitoken', ...parts.map((p) => p.replaceAll(path.sep, '/')));
}

// --- scanners --------------------------------------------------------------

async function scanInferenceCell(cellDir, conceptName, regime, dimension, valueLabel, mode) {
  const entries = await readdirSafe(cellDir);
  const strengths = [];
  let gridUrl = null;
  const url = (name) => relUrl(conceptName, 'inference', regime, dimension, valueLabel, mode, name);
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (ent.name === 'grid.png') {
      gridUrl = url('grid.png');
      continue;
    }
    const parsed = parseInferenceFilename(ent.name);
    if (!parsed) continue;
    strengths.push({
      strength: parsed.strength,
      layer: parsed.layer,
      url: url(ent.name),
    });
  }
  strengths.sort((a, b) => a.strength - b.strength);
  return { strengths, grid: gridUrl };
}

async function scanSweep(sweepDir, conceptName, regime, dimension) {
  const valueDirs = await readdirSafe(sweepDir);
  const values = [];
  for (const ent of valueDirs) {
    if (!ent.isDirectory()) continue;
    const valueNum = parseSweepValue(dimension, ent.name);
    if (valueNum === null) continue;
    const modes = {};
    for (const mode of TOKEN_MODES) {
      const cellDir = path.join(sweepDir, ent.name, mode);
      if (!existsSync(cellDir)) continue;
      modes[mode] = await scanInferenceCell(
        cellDir,
        conceptName,
        regime,
        dimension,
        ent.name,
        mode,
      );
    }
    values.push({ label: ent.name, value: valueNum, modes });
  }
  values.sort((a, b) => a.value - b.value);
  return values;
}

async function scanInference(conceptDir, conceptName) {
  const inferenceDir = path.join(conceptDir, 'inference');
  if (!existsSync(inferenceDir)) return null;
  const regimes = {};
  for (const regime of REGIMES) {
    const regimeDir = path.join(inferenceDir, regime);
    if (!existsSync(regimeDir)) continue;
    const dims = {};
    for (const dimension of SWEEP_DIMENSIONS) {
      const dimDir = path.join(regimeDir, dimension);
      if (!existsSync(dimDir)) continue;
      const values = await scanSweep(dimDir, conceptName, regime, dimension);
      if (values.length) dims[dimension] = values;
    }
    if (Object.keys(dims).length) regimes[regime] = dims;
  }
  if (!Object.keys(regimes).length) return null;
  return regimes;
}

async function scanElasticBand(conceptDir, conceptName) {
  const ebDir = path.join(conceptDir, 'elastic_band');
  if (!existsSync(ebDir)) return null;
  const entries = await readdirSafe(ebDir);
  const strengths = [];
  let summary = null;
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (ent.name === 'summary.json') {
      summary = await readJson(path.join(ebDir, ent.name));
      continue;
    }
    const parsed = parseElasticFilename(ent.name);
    if (!parsed) continue;
    strengths.push({
      strength: parsed.strength,
      url: relUrl(conceptName, 'elastic_band', ent.name),
    });
  }
  strengths.sort((a, b) => a.strength - b.strength);
  return { strengths, summary };
}

async function scanConcept(conceptDir, name) {
  const tokensToEdit = await readJson(path.join(conceptDir, 'tokens_to_edit.json'));
  const inference = await scanInference(conceptDir, name);
  const elasticBand = await scanElasticBand(conceptDir, name);
  const meta = { tokensToEdit: tokensToEdit ?? null };
  if (elasticBand?.summary) {
    meta.prompt = elasticBand.summary.prompt ?? null;
    meta.defaults = {
      cfg: elasticBand.summary.cfg ?? null,
      temperature: elasticBand.summary.temperature ?? null,
      image_top_k: elasticBand.summary.image_top_k ?? null,
      seed: elasticBand.summary.seed ?? null,
      layer: elasticBand.summary.layer ?? null,
    };
  }
  return { name, meta, inference, elasticBand };
}

async function scanAll() {
  if (!existsSync(unitokenDir)) {
    throw new Error(
      `OUTPUTS_DIR/unitoken not found: ${unitokenDir}\n` +
        `Set OUTPUTS_DIR to the parent containing unitoken/, or rsync outputs/ into the repo.`,
    );
  }
  const entries = await readdirSafe(unitokenDir);
  const concepts = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    concepts.push(await scanConcept(path.join(unitokenDir, ent.name), ent.name));
  }
  concepts.sort((a, b) => a.name.localeCompare(b.name));
  return { concepts, generatedAt: new Date().toISOString(), source: unitokenDir };
}

// --- staging (symlink or copy) --------------------------------------------

async function stageAssets() {
  await fs.mkdir(publicDataDir, { recursive: true });
  // Remove any previous staging
  try {
    const stat = await fs.lstat(stagedDir);
    if (stat.isSymbolicLink() || stat.isFile()) await fs.unlink(stagedDir);
    else await fs.rm(stagedDir, { recursive: true, force: true });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (stageMode === 'symlink') {
    await fs.symlink(unitokenDir, stagedDir, 'dir');
    return { mode: 'symlink' };
  }
  if (stageMode === 'copy') {
    await fs.cp(unitokenDir, stagedDir, { recursive: true });
    return { mode: 'copy' };
  }
  throw new Error(`Unknown STAGE_MODE: ${stageMode}`);
}

// --- main ------------------------------------------------------------------

async function main() {
  console.log(`[build-tree] outputs dir: ${unitokenDir}`);
  console.log(`[build-tree] stage mode:  ${stageMode}`);
  const tree = await scanAll();
  await stageAssets();

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const header = `// AUTO-GENERATED by scripts/build-tree.mjs — do not edit by hand.\n`;
  // `as Tree` bypasses excess-property checks. The scanner output is the
  // source of truth for the manifest shape; types.ts is the consumer view
  // and only needs to describe the fields the UI reads.
  const body = `import type { Tree } from './types';\nconst tree = ${JSON.stringify(tree, null, 2)} as Tree;\nexport default tree;\n`;
  await fs.writeFile(manifestPath, header + body);

  const totalImages = tree.concepts.reduce((acc, c) => {
    let n = 0;
    if (c.inference) {
      for (const dims of Object.values(c.inference)) {
        for (const values of Object.values(dims)) {
          for (const v of values) {
            for (const m of Object.values(v.modes)) {
              n += m.strengths.length + (m.grid ? 1 : 0);
            }
          }
        }
      }
    }
    if (c.elasticBand) n += c.elasticBand.strengths.length;
    return acc + n;
  }, 0);

  console.log(
    `[build-tree] wrote manifest with ${tree.concepts.length} concept(s), ${totalImages} image(s).`,
  );
}

main().catch((err) => {
  console.error('[build-tree] failed:', err);
  process.exit(1);
});
