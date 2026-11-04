"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/api-client";

export function AccountSettings({ user, usage }: { user: { name: string; email: string }; usage: { projectSlots: number; projectEvents: number; aiCalls: number } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>, kind: "profile" | "password") {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      await requestJson(kind === "profile" ? "/api/account" : "/api/account/password", kind === "profile" ? "PATCH" : "POST", kind === "profile" ? { name: data.get("name") } : { currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") });
      if (kind === "password") { router.replace("/login"); router.refresh(); }
      else { setMessage("Profile saved."); router.refresh(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please retry."); }
    finally { setBusy(false); }
  }
  return <main className="overview-main settings-main"><div className="page-heading"><div><span className="eyebrow">YOUR ACCOUNT</span><h1>A workspace <span>that’s yours.</span></h1><p>Manage your profile, security, and current usage.</p></div></div>{message && <p role="status" className="action-message">{message}</p>}<div className="settings-grid"><section className="details-panel"><h2><UserRound size={18} />Profile</h2><form className="stack-form" onSubmit={event => submit(event, "profile")}><label>Display name<input name="name" defaultValue={user.name} required maxLength={80} disabled={busy} /></label><label>Email address<input value={user.email} readOnly /></label><p className="form-hint">Email changes and email verification are not enabled in this preview.</p><Button disabled={busy} type="submit">Save profile</Button></form></section><section className="details-panel"><h2><ShieldCheck size={18} />Workspace usage</h2><div className="usage-row"><span>Project slots used</span><strong>{usage.projectSlots} / 100</strong></div><div className="usage-row"><span>Project creation events</span><strong>{usage.projectEvents}</strong></div><div className="usage-row"><span>Recorded AI actions</span><strong>{usage.aiCalls}</strong></div><p className="form-hint">Slots include archived projects and Trash. Each explicit AI action is counted before calling Gemini, including failed attempts. Templates, graph editing, exports, and routine project saves use zero AI requests. HoloStack has no active subscription or billing integration.</p></section><section className="details-panel"><h2><LockKeyhole size={18} />Change password</h2><form className="stack-form" onSubmit={event => submit(event, "password")}><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} /></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" required minLength={15} maxLength={128} disabled={busy} /></label><p className="form-hint">Use 15–128 characters. Changing your password signs out every session, including this one.</p><Button disabled={busy} type="submit">Change password</Button></form></section><section className="details-panel"><h2><ShieldCheck size={18} />Session security</h2><p>Sessions expire after seven days. Sign out all devices to revoke every current session immediately.</p><Button variant="outline" disabled={busy} onClick={async () => {
    if (!window.confirm("Sign out every device, including this one?")) return;
    setBusy(true); setMessage("");
    try { await requestJson("/api/account/sessions", "DELETE"); router.replace("/login"); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Please retry."); setBusy(false); }
  }}>Sign out all devices</Button><p className="form-hint">Password recovery is not enabled yet. Keep your credentials in a password manager.</p></section></div></main>;
}
