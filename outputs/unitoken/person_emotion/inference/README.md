# Steering regimes

Two regimes for how the steering perturbation is applied during AR generation:

| Subdir | Hook firing | Effect |
|---|---|---|
| `prompt-only/` | Fires once on the first prefill forward (matches upstream `demo_img.py`) | Perturbation enters the KV cache once; ~1024 image tokens then decode unsteered |
| `every-step/` | Fires on every forward call (steering re-applied each generation step) | Bias sustained throughout AR decoding — typically stronger, more sustained concept effect |

Inside each regime, the same hyperparameter sweeps are kept side-by-side. See
`prompt-only/README.md` for the sweep matrix and held-constant defaults.

Empty `every-step/` is reserved for the every-step variant runs.
