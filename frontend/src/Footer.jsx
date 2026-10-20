import "./Footer.css";

export default function Footer() {
  return (
    <footer className="dermai-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a className="logo footer-logo" href="#top" aria-label="DermAI home">
            <span className="logo-icon">d</span>
            <span>derm<span>ai</span></span>
          </a>
          <p>
            Exploring skin health through AI-assisted image analysis
            and responsible technology.
          </p>
          <span className="footer-status">
            <span className="footer-status-dot" />
            Experimental research prototype
          </span>
        </div>

        <div className="footer-links">
          <h3>Explore</h3>
          <a href="#top">Home</a>
          <a href="#analyze">Analyze image</a>
          <a href="#how">How it works</a>
        </div>

        <div className="footer-links">
          <h3>Project</h3>
          <a
            href="https://github.com/yadav32467/DreamAI"
            target="_blank"
            rel="noreferrer"
          >
            GitHub repository ↗
          </a>
          <a href="#medical-note">Medical disclaimer</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} DermAI · Academic Project</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
