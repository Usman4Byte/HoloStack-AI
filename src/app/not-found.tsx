import Link from "next/link";
export default function NotFound() { return <main className="fallback-page"><span className="eyebrow">404 / OFF THE MAP</span><h1>This page isn’t part of the system.</h1><Link className="text-link" href="/">Return to the workspace →</Link></main>; }
