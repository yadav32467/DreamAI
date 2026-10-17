import { useRef, useState } from "react";
import "./App.css";

const API_URL = "https://dermai-api-r2in.onrender.com";
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function chooseFile(nextFile) {
    setError("");
    setMessage("");
    setResult(null);
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (nextFile.size > MAX_SIZE) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  }

  function resetUpload() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setError("");
    setMessage("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadImage(event) {
    event.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setError("");
    setMessage("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const raw = await response.text();
      let data;
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { detail: raw }; }
      if (!response.ok) {
        throw new Error(data.detail || data.message || `Upload failed (${response.status})`);
      }
      setResult(data);
      setMessage("Image uploaded successfully.");
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Could not connect to DermAI. The free backend may be waking up—wait 30–60 seconds and try again.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="DermAI home">
          <span className="brand-mark">✳</span><span>Derm<span className="brand-accent">AI</span></span>
        </a>
        <span className="topbar-label"><span className="status-dot" /> Skin image assistant</span>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR SKINCARE COMPANION</div>
          <h1>A clearer picture<br />of your <span>skin health.</span></h1>
          <p className="hero-description">Upload a skin image to get started. DermAI securely sends your image to the app backend for processing.</p>
          <div className="trust-row">
            <span><span className="check-icon">✓</span> Simple upload</span>
            <span><span className="check-icon">✓</span> JPG, PNG, WEBP</span>
            <span><span className="check-icon">✓</span> Up to 5 MB</span>
          </div>
        </div>

        <section className="upload-card" aria-label="Upload a skin image">
          <div className="card-heading">
            <div><p className="step-label">GET STARTED</p><h2>Upload an image</h2></div>
            <div className="upload-symbol" aria-hidden="true">↑</div>
          </div>
          <form onSubmit={uploadImage}>
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            {!preview ? (
              <button
                type="button"
                className={`dropzone ${dragging ? "dropzone-active" : ""}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}
              >
                <span className="cloud-icon" aria-hidden="true">⇧</span>
                <strong>Drop your image here</strong>
                <span className="dropzone-sub">or click to browse files</span>
                <span className="file-types">JPG · PNG · WEBP</span>
              </button>
            ) : (
              <div className="preview-wrap">
                <img className="image-preview" src={preview} alt="Selected image preview" />
                <div className="preview-meta"><span className="file-badge">IMG</span><div className="file-info"><strong>{file?.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to upload</span></div><button className="remove-button" type="button" onClick={resetUpload} aria-label="Remove image">×</button></div>
              </div>
            )}

            {error && <div className="notice notice-error" role="alert"><strong>Something went wrong</strong><span>{error}</span></div>}
            {message && <div className="notice notice-success" role="status"><strong>✓ {message}</strong><span>{result?.message || result?.filename || "Your image was received by the backend."}</span></div>}

            <button className="primary-button" type="submit" disabled={!file || loading}>
              {loading ? <><span className="spinner" /> Uploading image…</> : <>Upload image <span aria-hidden="true">→</span></>}
            </button>
            <p className="privacy-note"><span aria-hidden="true">▣</span> Only upload images you have permission to use. Avoid including your face or identifying details.</p>
          </form>
        </section>
      </section>

      <section className="how-section">
        <div className="section-intro"><p className="step-label">HOW IT WORKS</p><h2>Simple by design.</h2><p>Three straightforward steps to get started.</p></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><div className="step-icon">▧</div><h3>Choose an image</h3><p>Select a clear JPG, PNG, or WEBP image from your device.</p></article>
          <article className="step-card"><span className="step-number">02</span><div className="step-icon">↥</div><h3>Upload securely</h3><p>The image is sent to the DermAI backend for handling.</p></article>
          <article className="step-card"><span className="step-number">03</span><div className="step-icon">✳</div><h3>Next: AI insights</h3><p>AI analysis is a separate feature and is not claimed by this upload demo.</p></article>
        </div>
      </section>

      <aside className="disclaimer"><span className="disclaimer-icon">ⓘ</span><p><strong>Important health note</strong> DermAI is an experimental project, not a medical device. Uploading an image does not provide a diagnosis. For any concerning, changing, painful, or bleeding skin spot, consult a qualified healthcare professional.</p></aside>
      <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark">✳</span><span>Derm<span className="brand-accent">AI</span></span></a><span>Built with care · Experimental demo</span></footer>
    </main>
  );
}
