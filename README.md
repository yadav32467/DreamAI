
# DermAI — AI-Powered Skin Lesion Image Analysis

DermAI is an experimental web application that allows users to upload a skin-lesion image and receive AI-generated classification predictions through a hosted Hugging Face model.

The project demonstrates how a React frontend, FastAPI backend, and externally hosted machine-learning model can work together in a web application.

> **Medical disclaimer:** DermAI is an educational research prototype, not a medical device. Its predictions are not a diagnosis and must not be used to make treatment decisions. Always consult a qualified healthcare professional about concerning skin changes.

## Live Demo

- **Frontend:** https://derm-1.netlify.app
- **Backend API:** https://dermai-api-r2in.onrender.com
- **API documentation:** https://dermai-api-r2in.onrender.com/docs
- **Health check:** https://dermai-api-r2in.onrender.com/health

## Features

- Upload JPG, JPEG, PNG, or WEBP images.
- Preview a selected image before analysis.
- Validate file type and enforce a 5 MB upload limit.
- Send images to a FastAPI backend.
- Connect to a hosted Hugging Face image-classification model.
- Display the predicted class, confidence score, and top predictions.
- Show loading states and user-friendly error messages.
- Provide a responsive interface for desktop and mobile screens.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| Styling | CSS |
| Backend | Python, FastAPI |
| API server | Uvicorn |
| Image upload | Multipart form data |
| AI inference | Hugging Face Space |
| Model client | `gradio_client` |
| Image processing | Pillow |
| Metadata storage | SQLite |
| Frontend hosting | Netlify |
| Backend hosting | Render |

## System Architecture

```text
User
 |
 | Selects a skin-lesion image
 v
React + Vite Frontend
 |
 | POST /analyze
 | multipart/form-data
 v
FastAPI Backend on Render
 |
 | Validates the image
 | Creates a temporary image file
 v
Hugging Face Space
Satyejeet69/SkinDiseaseClassifier
 |
 | Runs image classification
 | Returns class predictions and scores
 v
FastAPI Backend
 |
 | Formats the response as JSON
 v
React Frontend
 |
 | Displays prediction and confidence
 v
User sees the result
```

The frontend handles the user interface, while the backend communicates with the hosted model. The machine-learning model is not trained directly by this project's frontend.

## How It Works

### 1. Image selection

The user selects an image from their device or drops it into the upload area.

The frontend checks that:
- The file is JPG, JPEG, PNG, or WEBP.
- The image is no larger than 5 MB.

A local preview is shown before analysis.

### 2. API request

When the user clicks **Analyze image**, the frontend creates a `FormData` object and sends the selected file to:

```http
POST https://dermai-api-r2in.onrender.com/analyze
```

The uploaded file is sent using the form field name `file`.

### 3. Backend validation

FastAPI checks the uploaded file type and size. It temporarily saves the image so that the hosted model client can process it.

### 4. Hugging Face inference

The backend connects to the hosted model:

`Satyejeet69/SkinDiseaseClassifier`

It submits the image through the model's Gradio prediction interface. The hosted model performs inference and returns classification results.

### 5. Prediction response

The backend converts the model response into a consistent JSON structure. The frontend then displays the top prediction and available alternative predictions.

## API Endpoints

### `GET /`

Returns basic information about the API.

### `GET /health`

Checks whether the backend is responding.

Example:

```json
{
  "status": "ok"
}
```

### `POST /upload`

Accepts an image upload and handles the project's upload workflow.

This endpoint is separate from AI analysis.

### `POST /analyze`

Sends an image to the hosted classification model and returns predictions.

**Request format:** `multipart/form-data`

| Field | Type | Requirement |
|---|---|---|
| `file` | Image file | Required |
| Supported formats | JPG, JPEG, PNG, WEBP | Required |
| Maximum file size | 5 MB | Required |

Example response:

```json
{
  "prediction": "Example_Class",
  "confidence": 0.36,
  "predictions": [
    {
      "label": "Example_Class",
      "confidence": 0.36
    },
    {
      "label": "Another_Class",
      "confidence": 0.28
    }
  ],
  "model": "Satyejeet69/SkinDiseaseClassifier",
  "disclaimer": "Research demo for skin-lesion images only; not a medical diagnosis."
}
```

The class names and confidence values above are illustrative examples, not a guaranteed output for every image. The actual response depends on the model's inference.

## Project Structure

```text
DreamAI/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── uploads/        # Runtime upload storage
│   └── database files   # Runtime data, if generated
│
├── README.md
└── .gitignore
```

Runtime files and local data directories may be created when the application runs. They are not necessarily committed to Git.

## Run the Project Locally

### Prerequisites

Install:
- Git
- Node.js and npm
- Python 3.10 or a compatible version supported by the dependencies

### 1. Clone the repository

```bash
git clone https://github.com/yadav32467/DreamAI.git
cd DreamAI
```

### 2. Start the backend

Open a terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API should be available at:

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

Keep this terminal running.

### 3. Start the frontend

Open a second terminal:

```bash
cd DreamAI/frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

http://localhost:5173

**Note:** The current frontend is configured to call the deployed Render API. Therefore, the frontend can use the live backend while running locally. To use a local backend instead, configure the frontend API URL to point to `http://127.0.0.1:8000` and allow that frontend origin in FastAPI CORS settings.

## Deployment

### Frontend — Netlify

The frontend is deployed to Netlify.

Typical build settings:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

After changing frontend code, rebuild and deploy the frontend to update the live website.

### Backend — Render

The FastAPI backend is deployed to Render.

Typical settings:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

After pushing backend changes to the configured Git branch, Render can deploy the updated API.

### Hugging Face model

The application uses the hosted Space:

https://huggingface.co/spaces/Satyejeet69/SkinDiseaseClassifier

Model availability, response time, and inference behavior depend on that external service. A sleeping, busy, unavailable, or changed Space can cause analysis requests to fail.

## Configuration and Security

- The frontend currently uses a configured backend URL in `frontend/src/App.jsx`.
- FastAPI CORS must allow the frontend origins that need API access.
- Uploaded images should be handled carefully because they may contain sensitive health information.
- Do not commit `.env` files, access tokens, credentials, private images, or local database files.
- Validate file types and size on the backend, even when the frontend already performs validation.
- Temporary images should be removed after inference when no longer needed.
- Production deployments should use appropriate access controls, retention policies, and secure logging.

## Troubleshooting

### The frontend cannot connect to the API

1. Check the backend health endpoint.
2. Confirm the API URL in `frontend/src/App.jsx`.
3. Check browser DevTools → Network and Console.
4. Verify the frontend origin is allowed by FastAPI CORS.

### Analysis returns an error

1. Open the backend Swagger UI.
2. Test `POST /analyze` with a supported image.
3. Check the Render logs for backend or Hugging Face errors.
4. Verify that the Hugging Face Space is available.

### The first request is slow

A free hosting service may need time to wake up. External model inference can also take time.

### Build the frontend

```bash
cd frontend
npm run build
```

The production files are generated in `frontend/dist`.

## Current Limitations

- The project relies on an externally hosted model rather than a model trained and hosted entirely within this repository.
- The model's clinical performance has not been independently validated by this application.
- Results may be unreliable for images that differ from the model's training data.
- A classification score is not a calibrated probability of disease and does not establish diagnostic certainty.
- The application is not a substitute for examination by a qualified clinician.
- Availability and latency depend partly on the external model service and free hosting tiers.

## Future Improvements

- Add automated frontend and backend tests.
- Improve request timeout handling and error reporting.
- Add configurable API URLs for local and production environments.
- Improve accessibility and mobile usability.
- Add privacy-conscious monitoring and upload-retention controls.
- Evaluate the model on appropriate, independently validated datasets before making clinical claims.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make a focused change.
4. Run the frontend build and test the affected backend endpoint.
5. Open a pull request with a clear description of the change.

## License

Add the appropriate license file and update this section before distributing the project. No license should be assumed unless one is actually present in the repository.

---

**DermAI is an experimental educational project. Predictions are for research demonstration only and must not be used as a medical diagnosis.**
