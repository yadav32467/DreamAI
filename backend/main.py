
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
    allow_origins=["http://localhost:5173","http://localhost:5174","https://derm-1.netlify.app"],
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
    import tempfile
    import os
    from pathlib import Path
    from gradio_client import Client, handle_file

    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Upload a JPG, PNG, or WEBP image.")

    content = await file.read()
    if not content or len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be non-empty and no larger than 5 MB.")

    suffix = Path(file.filename or "image.jpg").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            temp_path = tmp.name

        client = Client("Satyejeet69/SkinDiseaseClassifier")
        result = client.predict(handle_file(temp_path), api_name="/predict")

        predictions = []

        if isinstance(result, dict):
            raw_predictions = result.get("confidences") or []
            for item in raw_predictions:
                if isinstance(item, dict):
                    label = item.get("label", "Unknown")
                    score = item.get("confidence", 0)
                    try:
                        predictions.append({
                            "label": str(label),
                            "confidence": float(score)
                        })
                    except (TypeError, ValueError):
                        continue

            if not predictions and result.get("label") is not None:
                predictions.append({
                    "label": str(result["label"]),
                    "confidence": 0.0
                })

        elif isinstance(result, list):
            for item in result:
                if isinstance(item, dict):
                    label = item.get("label", "Unknown")
                    score = item.get("confidence", item.get("score", 0))
                    try:
                        predictions.append({
                            "label": str(label),
                            "confidence": float(score)
                        })
                    except (TypeError, ValueError):
                        continue

        else:
            raise ValueError("Unexpected model response")

        if not predictions:
            raise ValueError("No predictions returned")

        predictions.sort(key=lambda x: x["confidence"], reverse=True)
        if not predictions:
            raise ValueError("No predictions returned")

        return {
            "prediction": predictions[0]["label"],
            "confidence": round(predictions[0]["confidence"], 4),
            "predictions": predictions[:3],
            "model": "Satyejeet69/SkinDiseaseClassifier",
            "disclaimer": "Research demo for skin-lesion images only; not a medical diagnosis."
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Free AI demo is temporarily unavailable or returned an unexpected result.") from exc
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass
