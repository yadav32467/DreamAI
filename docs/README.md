# DermAI Documentation

This directory contains curated project documentation and research summaries.

## Submission Documents

| Document | Description |
|---|---|
| [Project Report](submission/DermAI_Project_Report.pdf) | Formal project report |
| [Dataset Inventory](submission/DermAI_Dataset_Inventory_2026-10-20.md) | Dataset inventory and provenance |
| [License Audit](submission/DermAI_License_Audit_v1.md) | Dataset licensing review |
| [License Audit — XLSX](submission/DermAI_License_Audit_v1.xlsx) | Editable licensing matrix |
| [Model Evaluation Scope](submission/MODEL_EVALUATION_SCOPE.md) | Evaluation scope and limitations |

## Research

- [Rejection Gate Research Summary](research/REJECTION_GATE_RESEARCH_SUMMARY.md)

## Important Status

- The live application uses a seven-class EfficientNet-B0 classifier.
- The frozen V1 suitability gate is integrated as an experimental pre-classifier filter; it is not clinically validated or a universal OOD detector.
- Clinical validation has not been established.
- Underlying image licensing and commercial-use restrictions must be checked before reuse.

## Model Artifact

- [Experimental Gate Model Card](../backend/models/EXPERIMENTAL_GATE_MODEL_CARD.md) — frozen research gate, provenance, threshold and limitations.
