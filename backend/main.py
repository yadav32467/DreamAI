
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

# Experimental local EfficientNet-B0 classifier.
# Research use only; not a medical diagnostic tool.

_model = None
_model_classes = None
_model_device = None

CLASS_NAMES = {
    "MEL": "Melanoma",
    "NV": "Melanocytic nevus",
    "BCC": "Basal cell carcinoma",
    "AKIEC": "Actinic keratoses / intraepithelial carcinoma",
    "BKL": "Benign keratosis-like lesion",
    "DF": "Dermatofibroma",
    "VASC": "Vascular lesion",
}


def get_skin_model():
    global _model, _model_classes, _model_device

    if _model is None:
        import torch
        from torch import nn
        from torchvision import models

        model_path = BASE_DIR / "models" / "dermai_efficientnet_b0.pth"
        if not model_path.is_file():
            raise RuntimeError("Trained model file is missing.")

        checkpoint = torch.load(
            model_path, map_location="cpu", weights_only=True
        )
        classes = checkpoint.get("classes")
        if not isinstance(classes, list) or len(classes) != 7:
            raise RuntimeError("Unexpected class list in model checkpoint.")

        model = models.efficientnet_b0(weights=None)
        model.classifier[1] = nn.Linear(
            model.classifier[1].in_features, len(classes)
        )
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()

        device = torch.device(
            "mps" if torch.backends.mps.is_available() else "cpu"
        )
        _model = model.to(device)
        _model_classes = classes
        _model_device = device

    return _model, _model_classes, _model_device


@app.post("/analyze")
async def analyze_skin(file: UploadFile = File(...)):
    from io import BytesIO
    import torch
    from torchvision import transforms

    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG, PNG, or WEBP image."
        )

    try:
        content = await file.read(MAX_FILE_SIZE + 1)

        if not content:
            raise HTTPException(status_code=400, detail="The image is empty.")
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image must be 5 MB or smaller."
            )

        try:
            with Image.open(BytesIO(content)) as img:
                if img.format not in ALLOWED_FORMATS:
                    raise HTTPException(
                        status_code=400,
                        detail="Supported formats: JPEG, PNG and WEBP."
                    )
                img.verify()

            with Image.open(BytesIO(content)) as img:
                img.load()
                image = img.convert("RGB")

        except HTTPException:
            raise
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid image."
            )

        model, classes, device = get_skin_model()

        preprocess = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])

        tensor = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            logits = model(tensor)
            scores = torch.softmax(logits, dim=1)[0].cpu().tolist()

        ranked = sorted(
            zip(classes, scores), key=lambda item: item[1], reverse=True
        )[:3]

        predictions = [
            {
                "label": CLASS_NAMES.get(code, code),
                "class_code": code,
                "confidence": round(float(score), 4),
            }
            for code, score in ranked
        ]

        return {
            "prediction": predictions[0]["label"],
            "confidence": predictions[0]["confidence"],
            "predictions": predictions,
            "model": "DermAI EfficientNet-B0 (ISIC 2018)",
            "disclaimer": (
                "Experimental research classifier for skin-lesion images only. "
                "Scores are model outputs, not medical probabilities or a diagnosis. "
                "Not validated for clinical use; consult a qualified clinician."
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Local model analysis error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Local skin-image analysis failed. Check the backend terminal."
        ) from exc
    finally:
        await file.close()
