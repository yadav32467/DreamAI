import { useEffect, useRef, useState } from "react";
import "./App.css";
import Footer from "./Footer";

const API_URL = (import.meta.env.VITE_API_URL || "https://dermai-api-r2in.onrender.com").replace(/\/$/, "");
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_HISTORY = 10;

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  return bytes < 1024 * 1024
    ? (bytes / 1024).toFixed(0) + " KB"
    : (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Just now";
  }
}

function isRejected(result) {
  return result?.status === "rejected" || result?.accepted === false;
}

function gateValue(result, key) {
  const value = Number(result?.gate?.[key]);
  return Number.isFinite(value) ? value : null;
}

// Completed cases are stored locally in IndexedDB. Images never leave this browser
// as part of history storage; only the normal /analyze request reaches the API.
const HISTORY_DB_NAME = "dermai-local-history";
const HISTORY_DB_VERSION = 1;
const HISTORY_STORE_NAME = "analyses";
const ACTIVE_CASE_STORAGE_KEY = "dermai-active-analysis-id";

function persistActiveCaseId(id) {
  try {
    if (id) window.localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_CASE_STORAGE_KEY);
  } catch {
    // The analysis history still works even if the browser blocks localStorage.
  }
}

function openHistoryDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support local analysis history."));
      return;
    }

    const request = window.indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        db.createObjectStore(HISTORY_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local analysis history."));
    request.onblocked = () => reject(new Error("Local analysis history is busy in another browser tab."));
  });
}

async function runHistoryRequest(mode, method, value) {
  const db = await openHistoryDatabase();

  return new Promise((resolve, reject) => {
    let result;
    let settled = false;
    const finishError = (error) => {
      if (settled) return;
      settled = true;
      db.close();
      reject(error || new Error("Local analysis history could not be updated."));
    };

    let transaction;
    try {
      transaction = db.transaction(HISTORY_STORE_NAME, mode);
      const store = transaction.objectStore(HISTORY_STORE_NAME);
      const request = value === undefined ? store[method]() : store[method](value);
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => finishError(request.error);
      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        db.close();
        resolve(result);
      };
      transaction.onerror = () => finishError(transaction.error);
      transaction.onabort = () => finishError(transaction.error);
    } catch (error) {
      finishError(error);
    }
  });
}

export default function App() {
  const inputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState("Checking");
  const [history, setHistory] = useState([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [dragging, setDragging] = useState(false);

  const activeCase = history.find((item) => item.id === activeCaseId) || null;
  const online = apiStatus === "Online";

  useEffect(() => {
    let active = true;

    async function checkApiStatus() {
      try {
        const response = await fetch(API_URL + "/health");
        if (!response.ok) throw new Error("API unavailable");
        if (active) setApiStatus("Online");
      } catch {
        if (active) setApiStatus("Offline");
      }
    }

    checkApiStatus();
    const timer = window.setInterval(checkApiStatus, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreHistory() {
      try {
        const savedRecords = await runHistoryRequest("readonly", "getAll");
        if (cancelled) return;

        savedRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const recordsToKeep = savedRecords.slice(0, MAX_HISTORY);
        const restored = recordsToKeep.map((record) => {
          const previewUrl = URL.createObjectURL(record.imageBlob);
          objectUrlsRef.current.add(previewUrl);
          return { ...record, preview: previewUrl };
        });

        setHistory(restored);

        // Restore the report that was open before the page was refreshed.
        let lastActiveId = null;
        try { lastActiveId = window.localStorage.getItem(ACTIVE_CASE_STORAGE_KEY); } catch {}
        if (lastActiveId && restored.some((record) => record.id === lastActiveId)) {
          setActiveCaseId(lastActiveId);
        } else if (lastActiveId) {
          persistActiveCaseId(null);
        }

        // Keep the persistent store bounded to the same limit shown in the UI.
        const expiredIds = savedRecords.slice(MAX_HISTORY).map((record) => record.id);
        await Promise.all(expiredIds.map((id) => runHistoryRequest("readwrite", "delete", id).catch(() => undefined)));
      } catch (error) {
        if (!cancelled) {
          setStorageError(error?.message || "Saved analysis history could not be restored.");
        }
      } finally {
        if (!cancelled) setHistoryReady(true);
      }
    }

    restoreHistory();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  function revokePreview(url) {
    if (url && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }

  function clearDraft() {
    if (preview && !history.some((item) => item.preview === preview)) {
      revokePreview(preview);
    }
    setFile(null);
    setPreview("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function startNewAnalysis() {
    if (loading) return;
    clearDraft();
    setActiveCaseId(null);
    persistActiveCaseId(null);
  }

  function chooseFile(nextFile) {
    setError("");
    setActiveCaseId(null);
    persistActiveCaseId(null);

    if (!nextFile) return;

    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError("Choose a JPG, PNG, or WEBP image.");
      return;
    }

    if (nextFile.size > MAX_SIZE) {
      setError("This image is larger than 5 MB. Choose a smaller file.");
      return;
    }

    if (preview && !history.some((item) => item.preview === preview)) {
      revokePreview(preview);
    }

    const nextPreview = URL.createObjectURL(nextFile);
    objectUrlsRef.current.add(nextPreview);
    setFile(nextFile);
    setPreview(nextPreview);
    if (inputRef.current) inputRef.current.value = "";
  }

  function openCase(item) {
    if (loading) return;
    if (preview && !history.some((entry) => entry.preview === preview)) {
      revokePreview(preview);
    }
    setFile(null);
    setPreview("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    setActiveCaseId(item.id);
    persistActiveCaseId(item.id);
  }

  function removeCase(id) {
    const item = history.find((entry) => entry.id === id);
    if (item) revokePreview(item.preview);
    setHistory((current) => current.filter((entry) => entry.id !== id));
    if (activeCaseId === id) {
      setActiveCaseId(null);
      persistActiveCaseId(null);
    }
    runHistoryRequest("readwrite", "delete", id).catch((error) => {
      setStorageError(error?.message || "Could not remove this saved case from browser storage.");
    });
  }

  function clearHistory() {
    history.forEach((item) => revokePreview(item.preview));
    setHistory([]);
    setActiveCaseId(null);
    persistActiveCaseId(null);
    runHistoryRequest("readwrite", "clear").catch((error) => {
      setStorageError(error?.message || "Could not clear saved browser history.");
    });
  }

  async function uploadImage(event) {
    event.preventDefault();
    if (!file || loading) return;

    const selectedFile = file;
    const selectedPreview = preview;

    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", selectedFile);

      const response = await fetch(API_URL + "/analyze", {
        method: "POST",
        body: form,
      });

      const raw = await response.text();
      let data;

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { detail: raw };
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.message ||
          "Analysis could not be completed (" + response.status + ")."
        );
      }

      const record = {
        id: window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        preview: selectedPreview,
        imageBlob: selectedFile,
        createdAt: new Date().toISOString(),
        result: data,
      };

      try {
        await runHistoryRequest("readwrite", "put", {
          id: record.id,
          fileName: record.fileName,
          fileSize: record.fileSize,
          imageBlob: selectedFile,
          createdAt: record.createdAt,
          result: data,
        });
        setStorageError("");
      } catch (storageFailure) {
        setStorageError("Analysis completed, but this browser could not save it for future visits: " + (storageFailure?.message || "storage unavailable"));
      }

      const nextHistory = [record, ...history];
      const removed = nextHistory.slice(MAX_HISTORY);
      removed.forEach((item) => revokePreview(item.preview));
      await Promise.all(removed.map((item) => runHistoryRequest("readwrite", "delete", item.id).catch(() => undefined)));

      setHistory(nextHistory.slice(0, MAX_HISTORY));
      setActiveCaseId(record.id);
      persistActiveCaseId(record.id);
      setFile(null);
      setPreview("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not connect to DermAI. The free backend may be waking up; wait a moment and try again."
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  return (
    <main className="site app-site" id="top">
      <header className="nav app-nav">
        <a className="logo" href="#top" aria-label="DermAI home">
          <span className="logo-icon">d</span>
          <span>derm<span>ai</span></span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a className="nav-link nav-link-active" href="#workspace">Workspace</a>
          <a className="nav-link" href="#how-it-works">How it works</a>
          <a className="nav-link" href="#medical-note">Safety</a>
        </nav>

        <div className="nav-actions">
          <span className={"api-pill " + (online ? "is-online" : apiStatus === "Offline" ? "is-offline" : "is-checking")}>
            <span className="api-dot" />
            API {apiStatus}
          </span>
          <span className="research-tag">RESEARCH PREVIEW</span>
        </div>
      </header>

      <section className="page-heading" id="workspace">
        <div>
          <div className="eyebrow"><span className="eyebrow-mark">✳</span> DERMATOLOGY IMAGE RESEARCH</div>
          <h1>Your skin analysis <span>workspace.</span></h1>
          <p>Review one image at a time. Completed analyses are saved on this device so you can revisit a result after refresh and start another case.</p>
        </div>
        <button className="button button-primary heading-new-button" type="button" onClick={startNewAnalysis} disabled={loading}>
          <span className="button-plus">＋</span> New analysis
        </button>
      </section>

      {storageError && (
        <div className="storage-notice" role="status">
          <b>Browser history notice</b><span>{storageError}</span>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="main-column" aria-label="Image analysis workspace">
          {!activeCase ? (
            <div className="panel upload-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">NEW CASE</span>
                  <h2>Upload a skin image</h2>
                  <p>Choose a clear, close-up photo of the area you want to review.</p>
                </div>
                <span className="step-count">STEP 01 <i>/</i> 03</span>
              </div>

              <div className="workflow-steps" aria-label="Analysis steps">
                <div className="workflow-step active"><span>1</span><div><b>Choose image</b><small>JPG, PNG, WEBP</small></div></div>
                <div className="workflow-connector" />
                <div className="workflow-step"><span>2</span><div><b>Image check</b><small>Suitability gate</small></div></div>
                <div className="workflow-connector" />
                <div className="workflow-step"><span>3</span><div><b>Review result</b><small>Model output</small></div></div>
              </div>

              <input
                ref={inputRef}
                className="hidden-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />

              {!preview ? (
                <button
                  className={"dropzone" + (dragging ? " dropzone-dragging" : "")}
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  aria-label="Choose or drop a skin image"
                >
                  <span className="dropzone-icon"><span>↑</span></span>
                  <strong>Drag and drop your image here</strong>
                  <span className="dropzone-subtitle">or <u>browse files</u> from your device</span>
                  <span className="dropzone-formats"><b>JPG</b><b>PNG</b><b>WEBP</b><i>Maximum file size 5 MB</i></span>
                </button>
              ) : (
                <div className="selected-image-card">
                  <div className="selected-image-frame">
                    <img src={preview} alt="Preview of selected skin image" />
                    <span className="image-ready-badge"><span /> Ready to analyze</span>
                  </div>
                  <div className="selected-image-meta">
                    <div className="file-type-icon">IMG</div>
                    <div className="selected-file-copy">
                      <strong>{file?.name}</strong>
                      <span>{formatSize(file?.size)} · JPG, PNG or WEBP</span>
                    </div>
                    <button className="icon-button" type="button" onClick={clearDraft} aria-label="Remove selected image" title="Remove image">×</button>
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-error" role="alert">
                  <span className="alert-symbol">!</span>
                  <div><b>We could not complete that request</b><p>{error}</p></div>
                </div>
              )}

              <form onSubmit={uploadImage}>
                <button className="button button-primary analyze-button" type="submit" disabled={!file || loading}>
                  {loading ? <><span className="spinner" /> Analyzing image…</> : <>Run image analysis <span>↗</span></>}
                </button>
              </form>

              <div className="upload-assurance">
                <span className="assurance-icon">♢</span>
                <div><b>One image, one analysis</b><p>Completed analyses are saved in this browser so you can return to them after refreshing or reopening the site.</p></div>
              </div>
            </div>
          ) : (
            <div className="panel report-panel">
              <div className="report-topline">
                <div>
                  <span className="section-kicker">CASE REPORT</span>
                  <h2>Analysis result</h2>
                  <p>Completed {formatDate(activeCase.createdAt)}</p>
                </div>
                <span className={"result-status " + (isRejected(activeCase.result) ? "status-rejected" : "status-accepted")}>
                  <span /> {isRejected(activeCase.result) ? "Not accepted" : "Analysis complete"}
                </span>
              </div>

              <div className="report-image-summary">
                <img src={activeCase.preview} alt={"Uploaded image: " + activeCase.fileName} />
                <div className="report-file-details">
                  <span className="section-kicker">UPLOADED IMAGE</span>
                  <strong>{activeCase.fileName}</strong>
                  <small>{formatSize(activeCase.fileSize)} · Analyzed by DermAI</small>
                  <button className="text-button" type="button" onClick={startNewAnalysis}>＋ Analyze another image</button>
                </div>
              </div>

              {isRejected(activeCase.result) ? (
                <div className="report-rejected">
                  <div className="report-message-title"><span>!</span><div><b>Image not accepted for classification</b><small>The suitability check could not confirm this as an in-scope skin image.</small></div></div>
                  <p>{activeCase.result?.message || "Please try a clear, close-up skin photo."}</p>
                  <div className="gate-metrics">
                    <div><small>GATE SCORE</small><strong>{gateValue(activeCase.result, "skin_score") === null ? "—" : gateValue(activeCase.result, "skin_score").toFixed(4)}</strong></div>
                    <div><small>ACCEPTANCE THRESHOLD</small><strong>{gateValue(activeCase.result, "threshold") === null ? "—" : gateValue(activeCase.result, "threshold").toFixed(4)}</strong></div>
                  </div>
                  <p className="report-caveat">A valid skin image may be rejected, and some unrelated images may still pass. This experimental filter is not a medical test.</p>
                </div>
              ) : (
                <>
                  <div className="primary-prediction">
                    <div>
                      <span className="section-kicker">TOP MODEL PREDICTION</span>
                      <h3>{activeCase.result?.prediction || activeCase.result?.predictions?.[0]?.label || "Prediction unavailable"}</h3>
                      <p>Research model output · not a diagnosis</p>
                    </div>
                    <div className="prediction-score">
                      <strong>{activeCase.result?.confidence == null ? "—" : (Number(activeCase.result.confidence) * 100).toFixed(1) + "%"}</strong>
                      <span>Model score</span>
                    </div>
                  </div>

                  {Array.isArray(activeCase.result?.predictions) && activeCase.result.predictions.length > 0 && (
                    <div className="predictions-section">
                      <div className="subsection-heading"><div><span className="section-kicker">MODEL OUTPUT</span><h3>Prediction breakdown</h3></div><span>TOP {activeCase.result.predictions.length}</span></div>
                      <div className="prediction-list">
                        {activeCase.result.predictions.map((item, index) => {
                          const score = Math.max(0, Math.min(100, Number(item.confidence || 0) * 100));
                          return (
                            <div className="prediction-item" key={(item.class_code || item.label || "class") + "-" + index}>
                              <div className="prediction-item-top"><span><i>{String(index + 1).padStart(2, "0")}</i>{item.label || item.class_code || "Unknown"}</span><b>{score.toFixed(1)}%</b></div>
                              <div className="score-track"><span style={{ width: score + "%" }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="gate-accepted">
                    <div className="gate-accepted-icon">✓</div>
                    <div><b>Image suitability check passed</b><p>Gate score {gateValue(activeCase.result, "skin_score") === null ? "—" : gateValue(activeCase.result, "skin_score").toFixed(4)} · threshold {gateValue(activeCase.result, "threshold") === null ? "—" : gateValue(activeCase.result, "threshold").toFixed(4)}</p></div>
                  </div>
                </>
              )}

              <div className="report-disclaimer">
                <span>i</span>
                <p>{activeCase.result?.disclaimer || "DermAI is an experimental research prototype and is not clinically validated. Model scores are not medical probabilities or a diagnosis."}</p>
              </div>

              <div className="report-actions">
                <button className="button button-primary" type="button" onClick={startNewAnalysis}>＋ New analysis</button>
                <button className="button button-secondary" type="button" onClick={() => setActiveCaseId(null)}>Back to upload</button>
              </div>
            </div>
          )}
        </section>

        <aside className="side-column">
          <section className="panel history-panel" aria-labelledby="history-title">
            <div className="side-panel-heading">
              <div><span className="section-kicker">YOUR SESSION</span><h2 id="history-title">Recent analyses</h2></div>
              <span className="history-count">{history.length}</span>
            </div>

            {!historyReady ? (
              <div className="history-empty">
                <span className="history-empty-icon">◌</span>
                <b>Restoring saved analyses…</b>
                <p>Loading your cases from this browser.</p>
              </div>
            ) : history.length === 0 ? (
              <div className="history-empty">
                <span className="history-empty-icon">▤</span>
                <b>No analyses yet</b>
                <p>Your completed image analyses will appear here, including after you refresh this page.</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item, index) => (
                  <div className={"history-entry" + (activeCaseId === item.id ? " history-entry-active" : "")} key={item.id}>
                    <button className="history-open" type="button" onClick={() => openCase(item)} aria-current={activeCaseId === item.id ? "true" : undefined}>
                      <img src={item.preview} alt="" />
                      <span className="history-entry-copy">
                        <strong>{item.fileName}</strong>
                        <small>{formatDate(item.createdAt)}</small>
                        <em className={isRejected(item.result) ? "history-rejected" : "history-accepted"}>
                          <i /> {isRejected(item.result) ? "Not accepted" : (item.result?.prediction || "Analysis complete")}
                        </em>
                      </span>
                    </button>
                    <button className="history-remove" type="button" onClick={() => removeCase(item.id)} aria-label={"Remove " + item.fileName + " from session history"} title="Remove from history">×</button>
                    {index < history.length - 1 && <div className="history-divider" />}
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <button className="clear-history" type="button" onClick={clearHistory}>Clear session history</button>
            )}
            <div className="history-privacy"><span>♢</span><p>Saved on this device in this browser. Your completed cases remain after refresh and browser restart. They are removed when you delete them, clear history, or clear this site's browser data.</p></div>
          </section>

          <section className="panel tips-panel">
            <span className="tips-symbol">✳</span>
            <span className="section-kicker">PHOTO CHECKLIST</span>
            <h3>Help the model review a clear image.</h3>
            <ul>
              <li>Use natural, even lighting.</li>
              <li>Keep the camera focused and steady.</li>
              <li>Frame the skin area without filters.</li>
              <li>Avoid including your face or personal details.</li>
            </ul>
            <div className="tips-format">JPG · PNG · WEBP <span>UP TO 5 MB</span></div>
          </section>
        </aside>
      </div>

      <section className="how-section" id="how-it-works">
        <div className="how-heading">
          <div><span className="section-kicker">A SIMPLE WORKFLOW</span><h2>From image to model output.</h2></div>
          <p>Each upload is reviewed independently by an experimental suitability filter and image-classification model.</p>
        </div>
        <div className="how-grid">
          <article><span className="how-number">01</span><div className="how-icon">↥</div><h3>Choose one image</h3><p>Upload a clear JPG, PNG, or WEBP photo. Preview it before starting the analysis.</p></article>
          <article><span className="how-number">02</span><div className="how-icon">◈</div><h3>Check image suitability</h3><p>An experimental gate checks whether the image appears to be within the model's intended scope.</p></article>
          <article><span className="how-number">03</span><div className="how-icon">✳</div><h3>Review the model output</h3><p>If accepted, the classifier returns its top predictions. You can then start another analysis.</p></article>
        </div>
      </section>

      <section className="medical-note" id="medical-note">
        <span className="medical-note-icon">i</span>
        <div><b>Important health and research notice</b><p>DermAI is an experimental academic research prototype, not a diagnostic device or substitute for professional medical care. Its image filter can reject valid skin images or accept unrelated images. Classification scores are not medical probabilities, and the model has not been clinically validated. For a changing, painful, bleeding, or concerning skin spot, consult a qualified healthcare professional.</p></div>
      </section>

      <Footer />
    </main>
  );
}
