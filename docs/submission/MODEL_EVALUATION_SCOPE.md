# Model Evaluation Scope — DermAI

DermAI contains a seven-class EfficientNet-B0 inference checkpoint in
`backend/models/dermai_efficientnet_b0.pth`.

Three separate local ISIC 2018 training experiments were conducted.
Their checkpoints were compared with the active backend checkpoint.
All three experiments have different model tensors from the active
backend checkpoint.

Experiment 3's exploratory evaluation reported:
- Accuracy: 83.62%
- Macro-F1: 71.57%
- Melanoma recall: 55.36%

These metrics describe the Experiment 3 checkpoint only. They must not
be presented as measured performance of the active backend checkpoint.

The test split was examined across multiple experiments and is not an
untouched independent benchmark. Clinical validation has not been
established.

The current classifier does not include a reliable image-rejection
gate. In an exploratory test, all 437 unrelated Open Images candidates
were assigned one of the seven skin-lesion labels.

DermAI is an educational research prototype, not a medical diagnostic
device. The results must not be used for diagnosis or treatment decisions.
