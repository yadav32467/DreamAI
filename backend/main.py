
import os
import uuid
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
DB_PATH = BASE_DIR / "dermai.db"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="DermAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://derm-1.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                case_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                image_path TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                status TEXT NOT NULL
            )
        """)


init_db()


@app.get("/")
def home():
    return {"message": "DermAI API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")

    case_id = str(uuid.uuid4())
    image_path = None

    try:
        content = await file.read(MAX_FILE_SIZE + 1)

        if not content:
            raise HTTPException(400, "The uploaded file is empty.")

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(413, "Image must be 5 MB or smaller.")

        # Verify actual image contents, not just its filename.
        from io import BytesIO

        try:
            with Image.open(BytesIO(content)) as img:
                if img.format not in ALLOWED_FORMATS:
                    raise HTTPException(
                        400, "Supported formats: JPEG, PNG and WEBP."
                    )
                img.verify()

            # Reopen and fully decode the image.
            with Image.open(BytesIO(content)) as img:
                img.load()
                extension = {
                    "JPEG": ".jpg",
                    "PNG": ".png",
                    "WEBP": ".webp",
                }[img.format]

        except HTTPException:
            raise
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(400, "The uploaded file is not a valid image.")

        safe_filename = f"{case_id}{extension}"
        image_path = UPLOAD_DIR / safe_filename

        with open(image_path, "xb") as saved_file:
            saved_file.write(content)

        uploaded_at = datetime.now(timezone.utc).isoformat()

        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.execute(
                    """
                    INSERT INTO cases
                    (case_id, filename, image_path, uploaded_at, status)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        case_id,
                        file.filename or safe_filename,
                        str(image_path),
                        uploaded_at,
                        "uploaded",
                    ),
                )
        except Exception:
            image_path.unlink(missing_ok=True)
            raise

        return {
            "message": "Image uploaded successfully",
            "case_id": case_id,
            "filename": safe_filename,
            "uploaded_at": uploaded_at,
            "status": "uploaded",
        }

    finally:
        await file.close()

# AI skin-image classification endpoint (research/educational prototype only)
@app.post("/analyze")
async def analyze_skin(file: UploadFile = File(...)):
    import os
    import requests
    from io import BytesIO
    from PIL import Image, UnidentifiedImageError
    from fastapi import HTTPException

    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WEBP image.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller.")
    try:
        img = Image.open(BytesIO(image_bytes))
        img.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="That file is not a valid image.")

    token = os.getenv("HF_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="AI is not configured yet. Add HF_TOKEN to Render Environment Variables.")

    model_id = os.getenv("HF_SKIN_MODEL", "LaurianeMD/vit-skin-disease")
    endpoint = f"https://router.huggingface.co/hf-inference/models/{model_id}"
    try:
        response = requests.post(
            endpoint,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/octet-stream"},
            data=image_bytes,
            timeout=90,
        )
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="AI provider could not be reached. Please try again shortly.")

    if response.status_code in (401, 403):
        raise HTTPException(status_code=502, detail="Hugging Face rejected the token. Check HF_TOKEN and its Inference Providers permission in Render.")
    if response.status_code == 503:
        raise HTTPException(status_code=503, detail="The AI model is loading or is not currently available. Please retry in a minute.")
    if response.status_code >= 400:
        detail = "The selected model is not available through this inference provider. Check HF_SKIN_MODEL or use a model enabled for HF Inference."
        try:
            provider_detail = response.json().get("error")
            if provider_detail:
                detail = str(provider_detail)[:400]
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=detail)

    try:
        predictions = response.json()
        if isinstance(predictions, dict):
            predictions = predictions.get("predictions", predictions.get("results", []))
        if not isinstance(predictions, list) or not predictions:
            raise ValueError("Unexpected model response")
        cleaned = []
        for item in predictions[:5]:
            if isinstance(item, dict) and "label" in item:
                cleaned.append({"label": str(item["label"]), "score": round(float(item.get("score", 0)), 4)})
        if not cleaned:
            raise ValueError("No prediction labels returned")
        top = cleaned[0]
    except Exception:
        raise HTTPException(status_code=502, detail="The AI model returned an unexpected response. Please try again.")

    return {
        "model": model_id,
        "prediction": top["label"],
        "confidence": top["score"],
        "predictions": cleaned,
        "disclaimer": "AI research result only, not a medical diagnosis. Image classifiers can be wrong; consult a qualified dermatologist for medical concerns."
    }

