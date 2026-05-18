# Sweep conditions

All sweeps below share the same prompt, seed, layer, vector, and α range
(α ∈ [−1, 1], 11 outputs). Only the dimension named in each subdir varies.

| Subdir | Varying | Held at defaults |
|---|---|---|
| `cfg/` | `cfg` ∈ {1, 2, 3, 4, 5} | `temperature=1.0`, `image_top_k=4000` |
| `temp/` | `temperature` ∈ {0.01, 0.2, 0.7, 1.0, 1.5, 2.0} | `cfg=3.0`, `image_top_k=4000` |
| `top_k/` | `image_top_k` ∈ {200, 1000, 4000, 8000} | `cfg=3.0`, `temperature=1.0` |

Every cell inside each subdir contains a `localized/` (steering at `tokens_to_edit`)
and `broadcast/` (steering across the whole prefill) variant.

Baseline = (`cfg=3.0`, `temperature=1.0`, `image_top_k=4000`) — the original
default in `run_unitoken.sh`. The same image set lives in `cfg/cfg_3`,
`temp/temp_1_0`, and (after the top_k runs) `top_k/top_k_4000`.

All sweeps:
- `prompt`: "A portrait of a person."
- `concept`: person_emotion (cartoon-vs-realistic vector, but applied to "person" token)
- `tokens_to_edit`: ["person"] (localized) / [] (broadcast)
- `layer`: 0 (embed_tokens)
- `seed`: 42
