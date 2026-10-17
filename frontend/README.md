# DermAI 🩺
### AI-Assisted Skin Condition Analysis — Research Prototype

DermAI is a web-based project designed to explore how computer vision and AI-assisted health information can help users understand possible skin conditions from uploaded images.

The project is being developed with a React frontend and a FastAPI backend. Its current functionality focuses on image upload, image validation, local file storage, and SQLite-based case records. AI-based skin image analysis and health-information features are planned for future development.

> **Medical Disclaimer:** DermAI is an experimental project, not a medical diagnostic tool. It does not replace a qualified dermatologist or other healthcare professional. Predictions, if added, must be appropriately evaluated before being used for any clinical purpose.

## ✨ Current Features

- **Image Upload:** Select and upload a skin image through the web interface.
- **Image Validation:** Validate supported image types and reject oversized or invalid image files.
- **Backend API:** Handle image uploads using FastAPI.
- **Local Image Storage:** Store uploaded images on the local backend during development.
- **Case Management:** Save image metadata, upload timestamps, and processing status in SQLite.
- **API Documentation:** Explore and test available endpoints through FastAPI's interactive Swagger UI.
- **Responsive Interface:** A React-based frontend for interacting with the application.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Backend | Python, FastAPI |
| Image Processing | Pillow |
| Database | SQLite |
| API Communication | HTTP / REST |
| Version Control | Git and GitHub |

## 🏗️ Project Structure

```text
DreamAI/
├── backend/
│   ├── main.py
│   ├── uploads/          # Local uploaded images
│   ├── derm ai.db        # Local SQLite database, if created
│   └── venv/             # Python virtual environment
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

*Note: The database, uploads folder, and virtual environment are local development artifacts and are not intended to be committed to GitHub.*

## 🚀 Getting Started

### Prerequisites

Install the following:

- Python 3.12 or a compatible Python version
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/yadav32467/DreamAI.git
cd DreamAI
```

### 2. Set up the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi "uvicorn[standard]" python-multipart pillow
```

Start the backend:

```bash
uvicorn main:app --reload
```

The API will normally run at:

- API: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs

Keep this terminal running.

### 3. Set up the frontend

Open a second terminal:

```bash
cd ~/Desktop/DreamAI/frontend
npm install
npm run dev
```

Open the local URL printed by Vite, normally:

http://localhost:5173

### 4. Test the upload API

Open the Swagger documentation:

http://127.0.0.1:8000/docs

Find the `POST /upload` endpoint, select an image, and execute the request. The API should return a response describing the uploaded case when the request succeeds.

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Check the API welcome response |
| GET | `/health` | Check API health |
| POST | `/upload` | Validate and save an image and record its metadata |

The exact response fields and validation rules are defined in `backend/main.py`.

## 🧠 Planned AI Features

The following features are planned and are not yet represented as completed functionality:

- Integrate an image-classification model for selected skin-condition categories.
- Return multiple candidate classes when supported by the model.
- Provide carefully sourced general information about possible conditions.
- Add relevant alternative conditions and uncertainty handling.
- Explain when an image is unsuitable for analysis or a result is inconclusive.
- Evaluate performance across different skin tones and image conditions.
- Add secure cloud deployment and appropriate data-retention controls.

A language model may help explain classification results, but it cannot independently establish a reliable diagnosis from an image. Model outputs must be evaluated and presented with appropriate limitations.

## 🔐 Security and Privacy

- Keep API tokens and other credentials in environment variables; never commit them to Git.
- Do not upload `.env` files, local databases, or private images to the public repository.
- Use HTTPS and appropriate access controls for a deployed application.
- Minimize the collection and retention of sensitive skin images.
- Use properly licensed datasets and respect their terms of use.
- Do not use experimental predictions as a substitute for professional medical assessment.

## 🗺️ Development Roadmap

- [x] Create the React frontend
- [x] Build the FastAPI backend
- [x] Implement image upload and validation
- [x] Save uploaded-image metadata in SQLite
- [ ] Integrate and test an image-classification API
- [ ] Add candidate-condition explanations and trusted references
- [ ] Evaluate model limitations and performance
- [ ] Deploy the frontend and backend
- [ ] Improve privacy, security, and data management

## 🤝 Contributing

Contributions, suggestions, and feedback are welcome. If you want to contribute, open an issue or submit a pull request describing the proposed change.

## 📄 License

No license has been specified yet. Until a license is added, permission to reuse, modify, or redistribute this project's code should not be assumed.

---

**Project:** DermAI  
**Repository:** https://github.com/yadav32467/DreamAI  
**Status:** Under active development
