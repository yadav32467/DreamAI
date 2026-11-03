# DermAI — Dataset Licence Audit (v1)

**Audit date:** 27 October 2026
**Purpose:** Record the current public-source licence findings and protect a future commercial path.
**Scope:** ISIC 2018 Task 3 aggregate dataset, 437 Open Images negative/OOD candidates, 20 SCIN review samples, ISIC-derived research checkpoints, and the existing repository checkpoint.

## Decision summary

**No asset or model checkpoint is marked commercial-use-approved by this audit.** This is a conservative project decision, not a legal determination that all uses are prohibited.

### 1. ISIC 2018 Task 3 aggregate dataset — restricted for commercial use

The official ISIC Challenge dataset page lists the 2018 Task 3 aggregate training dataset (10,015 images with labels) as **CC BY-NC** and provides the required citation information. ISIC's broader Archive FAQ also notes that licensing may vary by individual image and that CC BY-NC images are for non-commercial use only.

**Project decision:** Keep experiments using this aggregate dataset in the research-only lane. Do not mark this dataset or the ISIC-derived experimental checkpoints as commercially cleared. For a future commercial-ready successor, use data with documented commercial permission or obtain separate permission from the relevant rights holders. The legal status of trained weights can be fact-specific; this audit does not make a legal conclusion about model weights.

Sources:
- https://challenge.isic-archive.com/data/
- https://www.isic-archive.com/blank-1
- https://creativecommons.org/licenses/by-nc/4.0/

### 2. Open Images V7 — pending per-image verification

The official Open Images V7 page says the images are listed as **CC BY 2.0**, but explicitly warns that Google makes no representations or warranties about each image's licence status and that users must verify licences individually. CC BY 2.0 allows commercial reuse subject to attribution and licence terms, but the Creative Commons page also warns that other rights such as publicity and privacy may affect a particular use.

The current gate candidate pool contains 437 images. Contact-sheet review helps with visual screening but is not evidence that every landing-page licence has been verified, nor does it replace full-resolution relevance review.

**Project decision:** Leave all 437 records pending. For each record, verify the actual landing page, creator, source URL, exact licence, attribution requirements, changes made, and potential third-party rights concerns. Only then assess technical suitability and training eligibility.

Sources:
- https://storage.googleapis.com/openimages/web/factsfigures_v7.html
- https://creativecommons.org/licenses/by/2.0/

### 3. SCIN — pending rights review

SCIN uses a custom **SCIN Data Use License**. The published licence grants rights to reproduce/share the licensed material and create/share adapted material; it includes attribution conditions when material is shared and prohibits attempts to re-identify or re-link de-identified subjects. It also says moral rights, publicity, privacy, and similar rights are not generally licensed, except for a limited waiver to the extent possible.

The licence text reviewed did not include an explicit non-commercial-only clause. That observation is **not equivalent to a blanket commercial clearance**, because the scope of rights the licensor can grant and other applicable rights still matter.

**Project decision:** Keep the 20 SCIN samples pending. Retain provenance, comply with attribution terms when sharing, never attempt re-identification, and get specific legal/dataset-owner review before using SCIN-derived materials in a commercial product. Do not treat source cohort labels as clinical ground truth.

Source:
- https://github.com/google-research-datasets/scin/blob/main/LICENSE

### 4. Existing repository checkpoint — provenance unverified

The current project checkpoint `backend/models/dermai_efficientnet_b0.pth` was not independently traced to all of its training data in this session. Therefore, this audit cannot claim that it is or is not commercially cleared.

**Project decision:** Do not overwrite or delete it. Audit its training-data lineage (dataset/version, licensing, source, contributors and processing history) before making any commercial rights claim.

Repository:
- https://github.com/yadav32467/DreamAI

## Recommended two-lane workflow

1. **Research lane:** Continue model experiments and gate development with current research sources, accurately labelled as research-only or pending rights review.
2. **Commercial-ready lane:** Create a separate data manifest and training run using only sources whose commercial permissions, attribution requirements, and relevant additional rights have been documented. Keep training lineage separate and traceable.
3. **Eligibility rule:** A sample is eligible only after both (a) technical/visual suitability review and (b) licence/rights review. Contact-sheet review alone must not approve training eligibility.
4. **No premature claims:** Do not present DermAI as a clinically validated diagnostic system. Commercial deployment also requires independent performance/safety evaluation and review of applicable medical-device/privacy requirements.

## Limitation of this audit

The prior local licence checklist and image manifests were not available in this runtime, so I did not modify any local CSV, repository source code, checkpoint, or dataset file. The attached workbook records source-level findings and a concrete action plan; it is not a row-by-row approval of the 437 Open Images records or 20 SCIN records. No legal advice is provided.
