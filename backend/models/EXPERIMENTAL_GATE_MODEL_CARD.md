# DermAI Experimental Image-Suitability Gate — Model Card

- Gate: `active_checkpoint_gate_v1`
- Artifact: `experimental_binary_gate.joblib`
- Artifact SHA256: `3909915a21b9e576c1be49e3d718cb4a69b216d5a66ba777d0a52839c4e2dae4`
- Feature source: active EfficientNet-B0 pooled pre-classifier embeddings (1280 values)
- Pipeline: `StandardScaler` + class-balanced `LogisticRegression`
- Threshold: `0.8454478979` (frozen from the 1st percentile of sampled ISIC validation skin scores)
- Label mapping: `1 = in-scope skin`, `0 = out-of-domain candidate`
- Required EfficientNet checkpoint SHA256: `643bc587d2734a3aaa558d03d55025ffdb50e66307fa83a21422358bb08e71ba`

## Intended role

An experimental suitability filter before DermAI's seven-class EfficientNet-B0 head. The gate does not diagnose, grade image quality, or prove that an accepted image is a skin lesion.

## Recorded research evidence

- Open Images category-held-out: 431/437 rejected (98.63%); six visually confirmed non-skin false accepts.
- NINCO diagnostic pilot: 243/248 rejected (97.98%); five visually confirmed non-skin false accepts.
- NINCO ISIC reference false rejection: 3/458 (0.66%).

These are limited sampled research evaluations, not estimates of universal real-world performance. The NINCO pilot is not a pristine confirmatory holdout.

## Limitations and warnings

- A valid skin image can be rejected.
- An unrelated image can be accepted and then receive a misleading seven-class label.
- The score is not a calibrated probability.
- Training/evaluation pools and fixed ISIC cohorts were reused in several experiments.
- Underlying image-level licence and commercial rights remain pending.
- No clinical validation or medical-device approval is established.

The API fails closed (503) if the gate artifact, checkpoint hash, pipeline structure, or feature dimension is invalid.
