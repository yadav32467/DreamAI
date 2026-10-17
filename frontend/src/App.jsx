import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    setResult(null);
    setError("");

    if (!selected) {
      setFile(null);
      setPreview("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selected.type)) {
      setFile(null);
      setPreview("");
      setError("Please choose a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setFile(null);
      setPreview("");
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function uploadImage() {
    if (!file) {
      setError("Choose an image before uploading.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("The backend returned an unreadable response.");
      }

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail;
        throw new Error(detail || `Upload failed (${response.status}).`);
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message?.includes("Failed to fetch")
          ? "Cannot connect to DermAI backend. Make sure the backend is running at http://127.0.0.1:8000."
          : err.message || "Upload failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    const input = document.getElementById("image-input");
    if (input) input.value = "";
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DermAI home">
          <span className="brand-mark">D<span>+</span></span>
          <span className="brand-copy">
            <strong>DermAI</strong>
            <small>SKIN IMAGE WORKSPACE</small>
          </span>
        </a>
        <span className="local-pill"><span className="status-dot" /> Local MVP</span>
      </header>

      <main className="main-content">
        <section className="intro">
          <p className="eyebrow">A SIMPLE START FOR SKIN IMAGE MANAGEMENT</p>
          <h1>Every image starts<br /><span>with a clear record.</span></h1>
          <p className="intro-copy">
            Upload an image to create a case record. Your file is validated
            and saved by the local DermAI backend.
          </p>
          <div className="feature-row">
            <span><b>01</b> Image validation</span>
            <span><b>02</b> Local storage</span>
            <span><b>03</b> Case record</span>
          </div>
        </section>

        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <p className="section-kicker">NEW CASE</p>
              <h2>Upload skin image</h2>
            </div>
            <span className="step-number">STEP 01 / 01</span>
          </div>

          <label className={`dropzone ${preview ? "has-preview" : ""}`} htmlFor="image-input">
            {preview ? (
              <>
                <img className="image-preview" src={preview} alt="Selected image preview" />
                <span className="change-image">Choose a different image</span>
              </>
            ) : (
              <div className="empty-state">
                <span className="upload-symbol" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <strong>Choose an image to upload</strong>
                <span>Click here to browse files on your Mac</span>
                <small>JPG, PNG or WEBP · Maximum 5 MB</small>
              </div>
            )}
            <input
              id="image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </label>

          {file && (
            <div className="file-row">
              <span className="file-icon">IMG</span>
              <span className="file-info">
                <strong>{file.name}</strong>
                <small>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to upload</small>
              </span>
              <button className="text-button" type="button" onClick={resetForm}>Remove</button>
            </div>
          )}

          {error && <div className="notice error-notice" role="alert">{error}</div>}

          <button className="upload-button" onClick={uploadImage} disabled={!file || loading}>
            {loading ? (
              <><span className="spinner" /> Uploading image...</>
            ) : (
              <>Upload image <span aria-hidden="true">↗</span></>
            )}
          </button>

          <p className="privacy-note">
            <span aria-hidden="true">⌑</span> Image is sent to your local development server.
            Do not use identifiable patient images for testing.
          </p>

          {result && (
            <section className="success-panel" aria-live="polite">
              <div className="success-heading">
                <span className="success-check">✓</span>
                <div>
                  <h3>Upload successful</h3>
                  <p>Your image was saved and a case record was created.</p>
                </div>
              </div>
              <div className="result-grid">
                <div className="result-item">
                  <span>CASE ID</span>
                  <code>{result.case_id}</code>
                </div>
                <div className="result-item">
                  <span>STATUS</span>
                  <strong className="uploaded-status">{result.status}</strong>
                </div>
                <div className="result-item">
                  <span>STORED FILE</span>
                  <code>{result.filename}</code>
                </div>
                <div className="result-item">
                  <span>UPLOADED AT</span>
                  <strong>{result.uploaded_at ? new Date(result.uploaded_at).toLocaleString() : "—"}</strong>
                </div>
              </div>
              <div className="diagnosis-note">
                <strong>Important:</strong> This MVP stores images only. It does not analyse
                the image or provide a medical diagnosis.
              </div>
              <button className="secondary-button" type="button" onClick={resetForm}>Upload another image</button>
            </section>
          )}
        </section>

        <div className="bottom-note">
          <span>DERMAI DEVELOPMENT BUILD</span>
          <span>Image upload · Validation · SQLite record</span>
        </div>
      </main>
    </div>
  );
}
