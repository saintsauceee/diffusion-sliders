# UniToken results viewer

A small Next.js app for navigating `outputs/unitoken/` — concept → regime →
sweep dimension → sweep value → token mode → strength. Builds as a static site
so it can be deployed to GitHub Pages.

## Quick start (local)

```bash
cd apps/web
npm install
npm run dev            # http://localhost:3000
```

`npm run dev` first runs `scripts/build-tree.mjs`, which:

1. Scans `../../outputs/unitoken/` and emits `lib/tree-data.generated.ts`.
2. Symlinks `public/data/unitoken → ../../../outputs/unitoken` so the dev
   server can serve the PNGs directly.

If your outputs live somewhere else, set `OUTPUTS_DIR`:

```bash
OUTPUTS_DIR=/network/scratch/.../outputs npm run dev
```

## Publishing to GitHub Pages

The repo includes `.github/workflows/deploy-web.yml`. It runs on:

- push to `main` that touches `apps/web/**` or `outputs/unitoken/**`
- manual `workflow_dispatch`

The workflow does **not** generate output PNGs — they must already be in the
repo at build time. Because `outputs/` is gitignored, you commit them with:

```bash
git add -f outputs/unitoken
git commit -m "Publish unitoken results for <concept>"
git push
```

(450 MB-ish for the current set; consider git-lfs if it grows.) On push, the
workflow installs Node, runs `npm install && npm run build` (which copies
outputs into `apps/web/public/data/unitoken/` and runs `next export`), then
uploads `apps/web/out/` to Pages.

For Pages to work, enable it once in **repo Settings → Pages → Source =
"GitHub Actions"**. The workflow auto-computes `BASE_PATH` from the repo name
so the site loads at `https://<owner>.github.io/<repo>/`.

## How the layout is interpreted

```
outputs/unitoken/
  <concept>/
    tokens_to_edit.json
    elastic_band/
      strength_<signed_float>.png       → image scrubber + chart
      summary.json                      → iteration chart + initialization
    inference/
      <regime>/                         regime ∈ {prompt-only, every-step}
        <dimension>/                    dimension ∈ {cfg, temp, top_k}
          <value>/                      e.g. cfg_3, temp_1_0, top_k_4000
            <token_mode>/               token_mode ∈ {localized, broadcast}
              L<layer>_a<strength>.png  → strength filmstrip + lightbox
              grid.png                  → hero composite
```

Anything not matching this layout is silently skipped — adding a new concept
just means dropping it under `outputs/unitoken/<name>/` and rebuilding.

## UX

- **Sidebar**: pick concept
- **Tabs**: Inference sweeps · Elastic band
- **Inference**: regime → dimension → value chips → mode toggle (both / localized / broadcast).
  Click any strength in the filmstrip to open the lightbox.
- **Lightbox**: ← → / Home / End to scrub; Esc closes. If you opened it while
  the mode toggle was on "both", the other token mode is shown side-by-side.
- **Elastic band**: line chart of dreamsim distance vs strength, one polyline
  per iteration. Click an iteration chip to focus, or "all" to overlay all of
  them. Click any data point to jump the filmstrip lightbox to that strength.

## Files

```
apps/web/
  app/                    Next.js app router
  components/             Viewer, Sidebar, InferenceView, ElasticBand*, Lightbox
  lib/
    types.ts              type definitions for the manifest
    url.ts                asset() + formatters
    tree-data.generated.ts (created by build-tree.mjs; gitignored)
  scripts/
    build-tree.mjs        the filesystem scanner
  next.config.mjs         output: 'export' + basePath wiring
  tailwind.config.ts
```
