
import os
import uuid
import sqlite3
import hashlib
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

# Experimental input-suitability gate. This is a research filter, not a
# validated image-quality model and not a guarantee against all OOD inputs.
GATE_THRESHOLD = 0.8454478979
EXPECTED_CHECKPOINT_SHA256 = "643bc587d2734a3aaa558d03d55025ffdb50e66307fa83a21422358bb08e71ba"
EXPECTED_GATE_SHA256 = "3909915a21b9e576c1be49e3d718cb4a69b216d5a66ba777d0a52839c4e2dae4"
_gate_pipeline = None


def get_rejection_gate():
    """Load the frozen V1 gate and verify its model/artifact provenance."""
    global _gate_pipeline

    if _gate_pipeline is None:
        import joblib

        checkpoint_path = BASE_DIR / "models" / "dermai_efficientnet_b0.pth"
        gate_path = BASE_DIR / "models" / "experimental_binary_gate.joblib"

        if not checkpoint_path.is_file() or not gate_path.is_file():
            raise RuntimeError("The experimental image-suitability model files are missing.")

        checkpoint_sha = hashlib.sha256(checkpoint_path.read_bytes()).hexdigest()
        if checkpoint_sha != EXPECTED_CHECKPOINT_SHA256:
            raise RuntimeError("The EfficientNet checkpoint does not match the gate's training checkpoint.")

        gate_sha = hashlib.sha256(gate_path.read_bytes()).hexdigest()
        if gate_sha != EXPECTED_GATE_SHA256:
            raise RuntimeError("The experimental gate artifact failed its SHA256 integrity check.")

        pipeline = joblib.load(gate_path)
        if list(getattr(pipeline, "named_steps", {}).keys()) != ["standardscaler", "logisticregression"]:
            raise RuntimeError("Unexpected experimental gate pipeline structure.")
        if getattr(pipeline, "n_features_in_", None) != 1280:
            raise RuntimeError("Experimental gate feature dimensions do not match EfficientNet-B0.")
        if [int(value) for value in pipeline.classes_] != [0, 1]:
            raise RuntimeError("Unexpected gate classes; expected 0=OOD and 1=in-scope skin.")

        _gate_pipeline = pipeline

    return _gate_pipeline


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

        # Fail closed if the experimental suitability model is missing,
        # incompatible, or not tied to the active EfficientNet checkpoint.
        try:
            gate_pipeline = get_rejection_gate()
        except Exception as exc:
            print(f"Experimental gate unavailable: {type(exc).__name__}: {exc}")
            raise HTTPException(
                status_code=503,
                detail="The experimental image-suitability check is unavailable. Analysis was stopped safely.",
            ) from exc

        tensor = preprocess(image).unsqueeze(0).to(device)

        # Match the research feature extraction exactly:
        # EfficientNet features -> average pooling -> flatten (1280 values).
        with torch.no_grad():
            feature_map = model.features(tensor)
            pooled = model.avgpool(feature_map)
            embeddings = torch.flatten(pooled, 1)

            gate_features = embeddings.detach().cpu().numpy().astype("float32", copy=False)
            gate_score = float(gate_pipeline.predict_proba(gate_features)[0, 1])

            if gate_score < GATE_THRESHOLD:
                return {
                    "status": "rejected",
                    "accepted": False,
                    "message": (
                        "The experimental image-suitability check could not confirm that this is an in-scope skin image. "
                        "Please try a clear, close-up skin photo."
                    ),
                    "gate": {
                        "version": "active_checkpoint_gate_v1",
                        "skin_score": round(gate_score, 6),
                        "threshold": GATE_THRESHOLD,
                        "decision": "rejected",
                    },
                    "disclaimer": (
                        "This experimental filter can reject valid skin images and can still miss some unrelated images. "
                        "Its score is not a medical probability and it is not clinically validated."
                    ),
                }

            logits = model.classifier(embeddings)
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
            "status": "accepted",
            "accepted": True,
            "gate": {
                "version": "active_checkpoint_gate_v1",
                "skin_score": round(gate_score, 6),
                "threshold": GATE_THRESHOLD,
                "decision": "accepted",
            },
            "prediction": predictions[0]["label"],
            "confidence": predictions[0]["confidence"],
            "predictions": predictions,
            "model": "DermAI EfficientNet-B0 (ISIC 2018)",
            "disclaimer": (
                "The experimental suitability gate accepted this image, but this does not prove it is a skin lesion. "
                "Classifier scores are not medical probabilities or a diagnosis. This research prototype is not clinically validated."
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
