import { Layers3 } from "lucide-react";

export function DeveloperProfileMenu() {
  return <details className="developer-links">
    <summary>Visit developer&apos;s profile</summary>
    <div className="developer-links-menu">
      <a href="https://github.com/usman4byte" target="_blank" rel="noopener noreferrer">Visit GitHub <span aria-hidden="true">↗</span></a>
      <a href="https://linkedin.com/in/usman4byte" target="_blank" rel="noopener noreferrer">Visit LinkedIn <span aria-hidden="true">↗</span></a>
    </div>
  </details>;
}

export function SiteHeader() {
  return <header className="site-author-bar">
    <a href="/" className="site-author-brand" aria-label="HoloStack AI home"><Layers3 size={21} /><span>HoloStack<span className="brand-ai">AI</span></span></a>
    <p className="author-credit">Made by <strong>Usman</strong> (<small>Usman4Byte</small>)</p>
    <DeveloperProfileMenu />
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <p className="author-credit">Made by <strong>Usman</strong> (<small>Usman4Byte</small>)</p>
    <DeveloperProfileMenu />
  </footer>;
}
