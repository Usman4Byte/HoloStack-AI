"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { requestJson } from "@/lib/api-client";
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div><button className="logout-button" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try { await requestJson("/api/auth/logout", "POST"); router.replace("/login"); router.refresh(); }
    catch { setError("Sign out failed. Retry."); setBusy(false); }
  }}><LogOut size={15} />{busy ? "Signing out…" : "Sign out"}</button>{error && <span role="alert" className="form-error">{error}</span>}</div>;
}
