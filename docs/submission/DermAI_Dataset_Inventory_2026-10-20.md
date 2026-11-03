# DermAI — Dataset Inventory and Rejection-Gate Plan

Research snapshot: 20 October 2026

## Decision summary

Use **Google Research's official SCIN dataset as the first real-world skin-image relevance/abstention dataset**, **Open Images V7 as a carefully license-audited source of unrelated-object photographs**, and **official ISIC/HAM10000 data only as in-scope lesion-class data where its non-commercial licence is compatible with the intended use**. Do not merge any datasets or train until each source, licence, intended use, and label mapping has been recorded.

No dataset found here is by itself a complete labelled set for all four needs: relevant lesion images, normal-looking skin, unrelated everyday images, and poor-quality images. The rejection gate requires a composite dataset plus an explicit quality-labeling procedure.

## Candidate inventory

| Dataset | Authoritative source | What it contains | Best DermAI use | Licence / restrictions | Decision |
|---|---|---|---|---|---|
| SCIN (Skin Condition Image Network) | https://github.com/google-research-datasets/scin ; official data bucket referenced in its README: `dx-scin-public-data` | 5,000+ volunteer contributions and 10,000+ images of common skin, nail or hair conditions, dermatologist labels, image paths, shot type (`CLOSE_UP`, `AT_AN_ANGLE`, `AT_DISTANCE`), demographic/skin-tone-related annotations. Its schema includes `related_category=LOOKS_HEALTHY` (self-reported) and up to three dermatologist `gradable_for_skin_condition` labels. | Primary source for consumer/mobile-style skin photos; candidate normal-looking/uncertain cases; weak labels for “abstain/ungradable.” | Custom SCIN Data Use License, not a generic CC licence. Requires attribution and a link to the source/licence, and disclosure of modifications when redistributing licensed material/adaptations. Strictly prohibits re-identification/re-linking. The license text does not contain a non-commercial clause, but privacy/publicity/moral rights are not broadly licensed; follow the complete licence and data documentation. | **Primary source for first pilot.** Do not treat every ungradable case as “poor quality”: the documentation says ungradable can mean typical skin/no discernible pathology, insufficient information, multiple conditions, or image-quality issues. `LOOKS_HEALTHY` is self-reported, not clinical confirmation. The official paper reports 97.9% of submitted contributions were genuine dermatological-condition images, so SCIN is not a source of unrelated everyday photos. |
| Open Images V7 | https://storage.googleapis.com/openimages/web/index.html ; annotation/source repository: https://github.com/openimages/dataset | Large multi-label image set with labels across thousands of everyday object categories; metadata records original URLs, landing URLs, image licence, author and title. | Select diverse unrelated examples: laptops/computers, household scenes, pets, food, landscapes, documents, etc.; manually audit the selected images. | Annotation data is CC BY 4.0 and repository code Apache 2.0. Images are listed as CC BY 2.0, **but the dataset maintainers explicitly disclaim warranties about individual image licence status and say to verify each image**. Keep the individual licence, author, title and landing-page attribution with every retained file; exclude unverified cases. | **Use only as a filtered source**, not a blind bulk download. Maintain per-image provenance/attribution. Include human-with-object scenes similar to the false-positive example only where the image's licence is verified. |
| ISIC Challenge / HAM10000 | https://challenge.isic-archive.com/data/ ; current HAM10000 archive collection: https://api.isic-archive.com/collections/212/ | Dermoscopic lesion images and diagnosis labels; HAM10000's classic label taxonomy aligns with DermAI's seven codes (MEL, NV, BCC, AKIEC, BKL, DF, VASC). ISIC also has segmentation tasks/masks for some challenge datasets. | In-scope lesion classification; possible lesion segmentation/cropping experiments; benchmark and independently sourced evaluation, only with careful duplicate/patient grouping. | Official ISIC Challenge data table marks applicable challenge training data CC-BY-NC. The live ISIC Archive says individual images follow the contributor-chosen licence; the current HAM10000 collection describes CC BY-NC 4.0. Do not assume all ISIC images share a single unrestricted licence. | **Use for the lesion branch only** and only for non-commercial research/education unless separately licensed. Not suitable for teaching the gate to reject unrelated photos or for normal-skin coverage. Verify licence for the precise collection/download. |

## Evidence and limitations that affect the design

1. SCIN is the strongest first candidate because it is the official Google Research release, has dermatologist label/gradability fields, real-world contributed images, shot-type metadata, and skin-tone-related annotations. Official repository reports known duplicates (15 image files repeated 42 times) and one missing image. Deduplicate and group by `case_id` before any split; keep all images from one contribution in the same split.
2. `dermatologist_gradable_for_skin_condition_* = false` is a mixed “cannot reliably classify this case” signal, not a pure blur/poor-exposure label. Do not relabel it as poor quality without review. Use a gate target like `ABSTAIN_OR_UNCLEAR` initially, then manually annotate reasons in a reviewed subset.
3. `related_category=LOOKS_HEALTHY` is user-reported and should be a candidate bucket for normal-looking skin—not ground truth that the skin is medically normal.
4. Open Images image rights must be verified per image. Save `ImageID`, `OriginalURL`, `OriginalLandingURL`, `License`, `Author`, `Title`, download status, and an internal audit decision alongside each downloaded image. No selected image should be copied into the repository until licence and attribution are recorded.
5. For quality rejection, combine human-reviewed labels with controlled blur, downsampling, compression, glare/underexposure augmentations derived from permitted in-scope images. Synthetic corruptions help robustness testing but do not replace a separate real-world quality test set.
6. Prevent leakage: split by subject/case/lesion, not random image alone; deduplicate using hashes and near-duplicate checks; reserve an independent test set. Report per-source/per-skin-tone metrics, false acceptance of unrelated images, false rejection of valid images, and calibration/coverage trade-offs.
7. The existing `.pth` checkpoint does not have a training script or dataset manifest in the DreamAI repository. Its label list is readable, but the training source, patient grouping, class balance, and independent accuracy are not verified by repository contents. Treat it as a baseline, not as a validated model.

## Proposed dataset labels for the first gate pilot

- `IN_SCOPE_SKIN_IMAGE`: human-reviewed skin/lesion image suitable for further assessment, regardless of whether its condition is one of the current seven classes.
- `NORMAL_LOOKING_OR_NO_CLEAR_LESION`: candidate class from user-reported `LOOKS_HEALTHY` plus review; do not imply a medical clearance.
- `UNCLEAR_OR_UNGRADABLE`: expert/curator says there is insufficient information, multiple conditions, or no reliable condition interpretation.
- `POOR_IMAGE_QUALITY`: manually reviewed low focus, too dark/bright, too small, obstructed, motion-blurred, or otherwise unsuitable image.
- `UNRELATED_IMAGE`: non-skin image (for example, a laptop, pet, food, document or landscape) from licence-verified sources or consented local collection.

Keep provenance fields separately: `source_dataset`, `source_record_id`, `source_url`, `license`, `attribution`, `case_or_subject_group`, `review_status`, `split`, `label_method`, `label_confidence`, `quality_reason`, and `sha256`.

## Official references

- SCIN official repository and download information: https://github.com/google-research-datasets/scin
- SCIN dataset schema: https://github.com/google-research-datasets/scin/blob/main/dataset_schema.md
- SCIN Data Use License: https://github.com/google-research-datasets/scin/blob/main/LICENSE
- SCIN research announcement: https://research.google/blog/scin-a-new-resource-for-representative-dermatology-images/
- SCIN published paper: https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2826506
- Open Images V7 overview: https://storage.googleapis.com/openimages/web/index.html
- Open Images image and annotation licence caveats: https://github.com/openimages/dataset/blob/main/READMEV1.md
- Official ISIC challenge data and licence table: https://challenge.isic-archive.com/data/
- Current HAM10000 archive collection and licence description: https://api.isic-archive.com/collections/212/

## Immediate next step

Download and inspect only SCIN's two metadata CSVs first; do not yet download all image files. Count the possible label buckets, inspect missing fields, case duplicates and gradability values, then use those numbers to decide which image files to retrieve. Keep all data outside the Git repository (for example `~/Downloads/dermai-data/scin/`) so medical images and dataset metadata are not accidentally committed to GitHub.
