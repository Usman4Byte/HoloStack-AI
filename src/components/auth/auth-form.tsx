"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Layers3, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/api-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    if (signup && data.get("password") !== data.get("confirmPassword")) { setError("Those passphrases don’t match yet."); setBusy(false); return; }
    try {
      await requestJson(`/api/auth/${mode}`, "POST", { email: data.get("email"), password: data.get("password"), ...(signup ? { name: data.get("name") } : {}) });
      router.replace("/dashboard"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Please retry."); setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-story"><Link href="/" className="brand"><Layers3 size={30} /><span>HoloStack<span className="brand-ai">AI</span></span></Link><div><span className="eyebrow">YOUR PRIVATE DESIGN WORKSPACE</span><h1>Sketch your system.<br /><span>Keep every version.</span></h1><p>A private home for your architecture, decisions, and the ideas that connect them.</p><div className="auth-benefit"><Network size={20} /><span>Seven grounded starting points</span></div><div className="auth-benefit"><ShieldCheck size={20} /><span>Your projects, in your workspace</span></div><div className="auth-benefit"><Layers3 size={20} /><span>Every save keeps a version snapshot</span></div></div><span className="auth-footnote">Development preview · Architecture design, not deployed infrastructure</span></section><section className="auth-form-panel"><Link href="/guest" className="text-link">← Continue as a guest</Link><div className="auth-form-card"><span className="auth-lock"><LockKeyhole size={22} /></span><h2>{signup ? "Create your account" : "Sign in to your workspace"}</h2><p>{signup ? "Your projects and edits will be saved in your private workspace." : "Open your projects and pick up where you left off."}</p><form onSubmit={submit} className="stack-form">
    {signup && <label>Your name<input name="name" autoComplete="name" required maxLength={80} placeholder="Your name" disabled={busy} /></label>}
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" disabled={busy} /></label>
    <label>Password<span className="password-control"><input name="password" type={passwordVisible ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 15 : 1} maxLength={128} placeholder={signup ? "A passphrase of 15+ characters" : "Your password"} disabled={busy} /><button type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(value => !value)}>{passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
    {signup && <label>Confirm password<span className="password-control"><input name="confirmPassword" type={confirmationVisible ? "text" : "password"} autoComplete="new-password" required minLength={15} maxLength={128} placeholder="Enter the same passphrase again" disabled={busy} /><button type="button" aria-label={confirmationVisible ? "Hide confirmation" : "Show confirmation"} aria-pressed={confirmationVisible} onClick={() => setConfirmationVisible(value => !value)}>{confirmationVisible ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>}
    {signup && <p className="form-hint">Use a unique passphrase of 15–128 characters. Email verification and password recovery are not available in this preview.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}<ArrowRight size={16} /></Button>
  </form><p className="auth-switch">{signup ? "Already have an account?" : "New to HoloStack?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create account"}</Link></p></div><p className="auth-privacy"><ShieldCheck size={14} />Password hashes and sessions stay on the server.</p></section></main>;
}
