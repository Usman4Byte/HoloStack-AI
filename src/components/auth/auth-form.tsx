"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers3, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/api-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await requestJson(`/api/auth/${mode}`, "POST", { email: data.get("email"), password: data.get("password"), ...(signup ? { name: data.get("name") } : {}) });
      router.replace("/dashboard"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Please retry."); setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-story"><Link href="/" className="brand"><Layers3 size={30} /><span>HoloStack<span className="brand-ai">AI</span></span></Link><div><span className="eyebrow">YOUR NEXT GREAT SYSTEM STARTS HERE</span><h1>Think clearly.<br />Design boldly.<br /><span>Build with intent.</span></h1><p>A private home for your architecture, decisions, and the ideas that connect them.</p><div className="auth-benefit"><Network size={20} /><span>Seven grounded starting points</span></div><div className="auth-benefit"><ShieldCheck size={20} /><span>Your projects, in your workspace</span></div><div className="auth-benefit"><Layers3 size={20} /><span>Every save keeps a version snapshot</span></div></div><span className="auth-footnote">Development preview · Architecture design, not deployed infrastructure</span></section><section className="auth-form-panel"><Link href="/" className="text-link">← Explore the sample</Link><div className="auth-form-card"><span className="auth-lock"><LockKeyhole size={22} /></span><h2>{signup ? "Make room for your ideas." : "Welcome back."}</h2><p>{signup ? "Create an account and your personal workspace." : "Sign in to pick up where you left off."}</p><form onSubmit={submit} className="stack-form">
    {signup && <label>Your name<input name="name" autoComplete="name" required maxLength={80} placeholder="How should we call you?" disabled={busy} /></label>}
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" disabled={busy} /></label>
    <label>Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 15 : 1} maxLength={128} placeholder={signup ? "A passphrase of 15+ characters" : "Your password"} disabled={busy} /></label>
    {signup && <p className="form-hint">Use a unique passphrase of 15–128 characters. Email verification and password recovery are not available in this preview.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}<ArrowRight size={16} /></Button>
  </form><p className="auth-switch">{signup ? "Already have an account?" : "New to HoloStack?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create account"}</Link></p></div><p className="auth-privacy"><ShieldCheck size={14} />Password hashes and sessions stay on the server.</p></section></main>;
}
