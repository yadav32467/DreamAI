import { useRef, useState } from "react";
import "./App.css";

const API_URL = "https://dermai-api-r2in.onrender.com";
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  function chooseFile(nextFile) {
    setError(""); setMessage(""); setResult(null);
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.includes(nextFile.type)) return setError("Choose a JPG, PNG, or WEBP image.");
    if (nextFile.size > MAX_SIZE) return setError("Image must be 5 MB or smaller.");
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile); setPreview(URL.createObjectURL(nextFile));
  }
  function resetUpload() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(""); setError(""); setMessage(""); setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }
  async function uploadImage(event) {
    event.preventDefault();
    if (!file || loading) return;
    setLoading(true); setError(""); setMessage(""); setResult(null);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch(`${API_URL}/analyze`, { method: "POST", body: form });
      const raw = await response.text();
      let data;
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { detail: raw }; }
      if (!response.ok) throw new Error(data.detail || data.message || `Upload failed (${response.status})`);
      setResult(data); setMessage("AI analysis complete");
    } catch (err) {
      setError(err instanceof TypeError
        ? "Could not connect. The free backend may be waking up—wait 30–60 seconds and retry."
        : (err.message || "Something went wrong. Please try again."));
    } finally { setLoading(false); }
  }

  return <main className="site" id="top">
    <header className="nav">
      <a className="logo" href="#top"><span className="logo-icon">d</span><span>derm<span>ai</span></span></a>
      <div className="nav-right"><span className="live-dot"></span><span>RESEARCH PREVIEW</span><a href="#how">How it works <b>↗</b></a></div>
    </header>

    <section className="hero">
      <div className="hero-left">
        <div className="pill"><span>✳</span> SKIN HEALTH, REIMAGINED</div>
        <h1>Get to know<br />your skin<span className="mint"> better.</span></h1>
        <p className="hero-lede">A simple place to start your skin-health journey. Upload an image and let DermAI handle it through a secure connection.</p>
        <div className="hero-stats">
          <div><strong>01</strong><span>Choose a photo</span></div>
          <i></i><div><strong>02</strong><span>Upload safely</span></div><i></i><div><strong>03</strong><span>Explore next steps</span></div>
        </div>
        <div className="hero-note"><span className="shield">✓</span><span><b>Your image. Your choice.</b><br/>Only upload images you have permission to use.</span></div>
      </div>

      <div className="workspace">
        <div className="workspace-top"><div><span className="tiny-label">DERMAI WORKSPACE</span><h2>Image check-in</h2></div><div className="secure-chip"><span>●</span> Connected</div></div>
        <div className="upload-area">
          <input ref={inputRef} className="hidden-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => chooseFile(e.target.files?.[0])}/>
          {!preview ? <button className="drop-area" type="button" onClick={() => inputRef.current?.click()} onDragOver={e => {e.preventDefault(); e.currentTarget.classList.add("dragging");}} onDragLeave={e => e.currentTarget.classList.remove("dragging")} onDrop={e => {e.preventDefault(); e.currentTarget.classList.remove("dragging"); chooseFile(e.dataTransfer.files?.[0]);}}>
            <span className="upload-art"><span>↑</span><i></i><b></b></span>
            <strong>Drop your image here</strong><span className="muted">or <u>browse files</u> on your device</span>
            <span className="format-row"><b>JPG</b><b>PNG</b><b>WEBP</b><em>MAX 5 MB</em></span>
          </button> : <div className="preview-panel"><img src={preview} alt="Selected skin image preview"/><div className="preview-caption"><span className="file-icon">IMG</span><span className="filename"><b>{file?.name}</b><small>{(file.size/1024/1024).toFixed(2)} MB · Ready</small></span><button type="button" className="remove" onClick={resetUpload} aria-label="Remove image">×</button></div></div>}
        </div>
        {error && <div className="feedback error" role="alert"><b>Upload needs attention</b><span>{error}</span></div>}
        {message && <div className="feedback success analysis-result" role="status">
  <b>✓ {message}</b>
  <div className="result-primary">
    <span>Top prediction</span>
    <strong>{String(result?.prediction || "Result unavailable").replaceAll("_", " ")}</strong>
    {Number.isFinite(Number(result?.confidence)) && result?.confidence != null &&
      <small>Model confidence: {(Number(result.confidence) * 100).toFixed(1)}%</small>}
  </div>
  {Array.isArray(result?.predictions) && result.predictions.length > 0 &&
    <div className="prediction-list">
      <b>Top predictions</b>
      {result.predictions.map((item, index) => <div className="prediction-row" key={`${item.label}-${index}`}>
        <span>{String(item.label || "Unknown").replaceAll("_", " ")}</span>
        <span>{(Number(item.confidence || 0) * 100).toFixed(1)}%</span>
      </div>)}
    </div>}
  <small>{result?.disclaimer || "Experimental research output only; not a medical diagnosis."}</small>
</div>}
        <form onSubmit={uploadImage}><button className="submit" disabled={!file || loading}>{loading ? <><span className="spinner"></span> Uploading image…</> : <>Analyze image <span>↗</span></>}</button></form>
        <div className="workspace-foot"><span>▣ Image upload</span><span>5 MB limit</span><span>⌁ API connected</span></div>
      </div>
      <div className="decor decor-one"></div><div className="decor decor-two"></div>
    </section>

    <section className="how" id="how">
      <div className="section-heading"><div><span className="tiny-label">A THOUGHTFUL FIRST STEP</span><h2>Small steps. Clear process.</h2></div><p>DermAI makes the upload step simple today, with room to grow into a more complete learning experience.</p></div>
      <div className="feature-grid">
        <article><div className="feature-top"><span className="feature-icon">↥</span><span className="number">01 / UPLOAD</span></div><h3>Bring your image</h3><p>Choose a clear photo in JPG, PNG, or WEBP format. Preview it before sending.</p></article>
        <article><div className="feature-top"><span className="feature-icon">◈</span><span className="number">02 / PROCESS</span></div><h3>Backend receives it</h3><p>Your selected image is sent to the running DermAI API with clear error handling.</p></article>
        <article><div className="feature-top"><span className="feature-icon">✳</span><span className="number">03 / NEXT</span></div><h3>AI analysis is next</h3><p>This version handles uploads only. It does not yet generate a validated skin assessment.</p></article>
      </div>
    </section>
    <section className="health-note"><span className="note-icon">i</span><div><b>A note about your health</b><p>DermAI is an experimental project, not a diagnostic tool. An image upload is not a diagnosis. For a changing, painful, bleeding, or concerning skin spot, consult a qualified healthcare professional.</p></div></section>
    <footer><a className="logo footer-logo" href="#top"><span className="logo-icon">d</span><span>derm<span>ai</span></span></a><span>Built as an experimental research prototype</span><a href="#top">Back to top ↑</a></footer>
  </main>;
}
