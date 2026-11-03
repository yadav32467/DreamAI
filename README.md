# DermAI — AI-Powered Skin Lesion Classification

<p align="center">
  <strong>An experimental AI research prototype for seven-class skin lesion image classification.</strong>
</p>

<p align="center">
  <a href="https://derm-1.netlify.app/">Live Application</a> ·
  <a href="https://dermai-api-r2in.onrender.com/docs">API Documentation</a> ·
  <a href="https://dermai-api-r2in.onrender.com/health">API Health</a>
</p>

> **Medical disclaimer:** DermAI is an educational research prototype, not a medical device. It does not provide a diagnosis or treatment recommendation. Model scores are not calibrated medical probabilities. Always consult a qualified healthcare professional about concerning skin changes.

## Live Services

| Component | URL |
|---|---|
| Web application | https://derm-1.netlify.app/ |
| Backend API | https://dermai-api-r2in.onrender.com/ |
| Swagger documentation | https://dermai-api-r2in.onrender.com/docs |
| Health check | https://dermai-api-r2in.onrender.com/health |

## Project Overview

DermAI provides a web interface where users can select a skin-lesion image, preview it, submit it to a FastAPI backend, and receive experimental predictions from an EfficientNet-B0 image classifier.

The current production application uses a model checkpoint stored in this repository. Research experiments for detecting non-skin images are maintained separately and have not been integrated into the live API.

## Current Features

- Responsive React-based interface.
- JPG, PNG and WEBP image upload.
- Maximum upload size of 5 MB.
- Image preview before analysis.
- Backend-side image validation.
- FastAPI inference endpoint.
- Locally loaded EfficientNet-B0 checkpoint.
- Top-three classification predictions.
- Model score display.
- SQLite-backed upload record workflow.
- API health-check endpoint.
- Research and medical disclaimer.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 |
| Frontend tooling | Vite |
| Styling | CSS |
| Backend | Python, FastAPI |
| API server | Uvicorn |
| Image processing | Pillow |
| Deep learning | PyTorch, Torchvision |
| Model architecture | EfficientNet-B0 |
| Database | SQLite |
| Frontend hosting | Netlify |
| Backend hosting | Render |

## Model Information

The current backend loads:

`backend/models/dermai_efficientnet_b0.pth`

The model predicts among seven ISIC 2018 Task 3 classes:

| Code | Class |
|---|---|
| MEL | Melanoma |
| NV | Melanocytic nevus |
| BCC | Basal cell carcinoma |
| AKIEC | Actinic keratoses / intraepithelial carcinoma |
| BKL | Benign keratosis-like lesion |
| DF | Dermatofibroma |
| VASC | Vascular lesion |

Input preprocessing uses 224 × 224 image resizing and ImageNet normalization.

**Important:** The live API currently performs seven-class classification only. It does not include the experimental non-skin/OOD rejection gate. An out-of-scope image may therefore receive one of the seven class predictions. Such an output is not evidence that the uploaded image contains a skin lesion.

## System Architecture

```text
User
 |
 v
React + Vite Frontend
 |
 | POST /analyze
 | multipart/form-data
 v
FastAPI Backend
 |
 | Validate uploaded image
 | Decode and preprocess
 v
EfficientNet-B0 Model
 |
 | Seven-class inference
 | Top-three scores
 v
FastAPI JSON Response
 |
 v
React Results Interface
```

The experimental rejection gate is a separate research component. It is not part of this production request flow.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API status |
| GET | `/health` | Health check |
| POST | `/upload` | Upload image and record metadata |
| POST | `/analyze` | Run seven-class model inference |
| GET | `/docs` | Swagger API documentation |

### Image analysis

**Endpoint:** `POST /analyze`

**Request:** `multipart/form-data`

| Field | Type | Requirement |
|---|---|---|
| `file` | Image file | Required |
| Formats | JPEG, PNG, WEBP | Supported |
| Maximum size | 5 MB | Enforced |

Example response structure:

```json
{
  "prediction": "Melanocytic nevus",
  "confidence": 0.9915,
  "predictions": [
    {
      "label": "Melanocytic nevus",
      "class_code": "NV",
      "confidence": 0.9915
    }
  ],
  "model": "DermAI EfficientNet-B0 (ISIC 2018)",
  "disclaimer": "Experimental research classifier for skin-lesion images only."
}
```

The values are illustrative and do not represent guaranteed results.

## Repository Structure

```text
DreamAI/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── models/
│       └── dermai_efficientnet_b0.pth
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── docs/
│   ├── README.md
│   ├── submission/
│   │   ├── DermAI_Project_Report.pdf
│   │   ├── DermAI_Project_Presentation.pdf
│   │   ├── DermAI_Project_Presentation.pptx
│   │   ├── DermAI_Dataset_Inventory_2026-10-20.md
│   │   ├── DermAI_License_Audit_v1.md
│   │   ├── DermAI_License_Audit_v1.xlsx
│   │   └── MODEL_EVALUATION_SCOPE.md
│   └── research/
│       └── REJECTION_GATE_RESEARCH_SUMMARY.md
│
├── .gitignore
└── README.md
```

See [Documentation Index](docs/README.md) for the report, presentation, dataset inventory, licensing review, model evaluation scope and research summary.

## Run Locally

### Prerequisites

- Git
- Python with compatible project dependencies
- Node.js and npm

### 1. Clone the repository

```bash
git clone https://github.com/yadav32467/DreamAI.git
cd DreamAI
```

### 2. Start the backend

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate

python -m pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

Local API:

- http://127.0.0.1:8000/
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/health

The checkpoint must be present in `backend/models/`.

### 3. Start the frontend

Open another terminal:

```bash
cd frontend

npm ci

VITE_API_URL=http://127.0.0.1:8000 npm run dev
```

Open the local URL printed by Vite, normally http://localhost:5173.

## Deployment

### Netlify — Frontend

Typical configuration:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

The frontend reads the backend URL from `VITE_API_URL`. Its default is the deployed Render API.

### Render — Backend

Typical configuration:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

The backend requires its Python dependencies and model checkpoint.

Verify actual deployment settings in the Netlify and Render dashboards.

## Research and Evaluation

The project includes research activities covering:

- ISIC 2018 Task 3 dataset preparation.
- EfficientNet-B0 training experiments.
- Model evaluation and checkpoint provenance.
- Open Images out-of-distribution experiments.
- Binary rejection-gate experiments.
- Hard-negative experiments.
- Five-seed split-stability checks.
- NINCO external diagnostic pilot.

The current rejection gate remains experimental and is not integrated into the live backend.

The NINCO pilot used a small representative sample. Its results are diagnostic evidence, not a full benchmark or final confirmatory evaluation.

See [Rejection Gate Research Summary](research/REJECTION_GATE_RESEARCH_SUMMARY.md).

## Dataset and Licensing

Dataset provenance and licensing are documented separately in the `docs/submission/` directory.

Underlying image-level rights and commercial-use permission have not been established for all research datasets. A dataset-level license listing does not automatically establish permission for every underlying image.

Commercial use is not approved unless the applicable rights have been independently verified.

No repository-wide software license is currently declared. Do not assume third-party images or datasets are covered by this repository's source-code permissions.

## Privacy and Security

- Do not commit `.env` files, passwords, API tokens or credentials.
- Do not commit private user images or local database files.
- Upload only images you have permission to share.
- Avoid uploading faces and identifying details.
- Validate file type and size on the backend.
- Review retention and access controls before real-world use.

## Current Limitations

- Seven-class skin-lesion classification only.
- No production non-skin rejection gate.
- No established clinical validation.
- Model scores are not calibrated medical probabilities.
- Performance on arbitrary real-world images has not been established.
- External evaluation is limited to the datasets and samples documented in the research materials.

---

**DermAI is an experimental educational research project, not a medical diagnostic tool.**
