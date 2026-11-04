# DermAI — Rejection Gate Research Summary

**Status: Experimental research gate integrated as a research-preview pre-classifier filter; not clinically validated.**

## Active Model Reference

- Model: DermAI EfficientNet-B0
- Classes: MEL, NV, BCC, AKIEC, BKL, DF, VASC
- Active checkpoint SHA256:

`643bc587d2734a3aaa558d03d55025ffdb50e66307fa83a21422358bb08e71ba`

## Open Images Experiments

| Experiment | OOD rejection | ISIC false rejection | AUROC |
|---|---:|---:|---:|
| Initial active-checkpoint V1 | 86/87 (98.85%) | 0.66% | 0.9885 |
| Category-held-out V1 | 431/437 (98.63%) | 1.18% mean | 0.9904 mean |
| Hard-negative V2 | 431/437 (98.63%) | 0.98% mean | 0.9902 mean |
| Known-category image-held-out V1 | 105/105 (100%) | 1.53% | 0.9999 |
| Known-category image-held-out V3 | 105/105 (100%) | 1.53% | 0.9999 |

V2 did not fix any of the six visually confirmed Open Images false accepts. V3 did not improve OOD rejection over its same-split baseline.

## Five-Seed Split Stability

| Metric | V1 mean | V3 mean |
|---|---:|---:|
| OOD rejection | 100.00% | 100.00% |
| ISIC false rejection | 1.57% | 1.53% |
| AUROC | 1.0000 | 1.0000 |

The five seeds reused the same finite Open Images pool and fixed ISIC test cohort. These are split-stability checks, not independent external replications.

## NINCO External Diagnostic Pilot

- Dataset: NINCO
- DOI: https://doi.org/10.5281/zenodo.8013288
- Archive MD5: `b9ffae324363cd900a81ce3c367cd834`
- Archive checksum: verified
- Representative sample: 256 images from 64 classes
- Visually confirmed non-skin candidates: 248
- Ambiguous microscopy images excluded: 8
- Classes represented in pilot manifest: 62
- SHA256 verification: passed for all 248 selected images

The frozen V1 gate was evaluated without fitting or threshold tuning on NINCO.

| Metric | Result |
|---|---:|
| NINCO images evaluated | 248 |
| Rejected by frozen gate | 243 |
| Passed by gate | 5 |
| OOD rejection | 97.98% |
| ISIC reference images | 458 |
| ISIC false rejection | 3/458 (0.66%) |
| External AUROC against ISIC reference | 0.9837 |
| Softmax-only NINCO rejection | 42.34% |
| Frozen threshold | 0.8454478979 |

## NINCO False-Accept Audit

All five false accepts were visually confirmed as non-skin:

| Category | False accepts |
|---|---:|
| lathyrus_odoratus | 1 |
| walker | 3 |
| windsor_chair | 1 |
| **Total** | **5** |

These images remain diagnostic external evidence. They must not be reused for training, hard-negative mining or threshold tuning.

NINCO is now a diagnostic pilot, not a pristine confirmatory holdout.

## Research Limitations

- NINCO contains only four representative samples from each of 62 classes in this pilot.
- Two microscopy classes were excluded as ambiguous.
- Category-level estimates based on four samples are imprecise.
- Repeated Open Images seeds reuse the same finite image pool.
- The ISIC reference test cohort has been reused.
- Contact-sheet review does not replace full-resolution inspection.
- Near-duplicate content may remain despite exact-hash checks.
- NINCO was designed for ImageNet OOD evaluation, not DermAI-specific clinical validation.
- Underlying image-level licensing and commercial rights remain pending.
- Clinical validation has not been established.

## Decision

The frozen V1 gate is now loaded by the FastAPI `/analyze` path before the seven-class classifier. The deployed integration is an experimental research-preview filter only. It must not be described as a clinically validated or universal OOD safeguard. The five NINCO false accepts and six Open Images category-holdout false accepts remain important evidence that unrelated images can still pass.

The next milestone is an independent external confirmatory OOD evaluation using new sources and broader visual domains, with an untouched test subset not used for training, threshold tuning, model selection or error inspection.
