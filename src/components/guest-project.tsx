"use client";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { ProjectEditor } from "@/components/projects/project-editor";
import { findGuestProject, getGuestServerSnapshot, getGuestSnapshot, GuestStorageError, subscribeGuest } from "@/domain/projects/guest-store";

export function GuestProject({ id }: { id: string }) {
  const snapshot = useSyncExternalStore(subscribeGuest, getGuestSnapshot, getGuestServerSnapshot);
  const result = useMemo(() => {
    if (snapshot === "__server__") return { project: null, error: "" };
    try { return { project: findGuestProject(id), error: "" }; }
    catch (error) { return { project: null, error: error instanceof GuestStorageError ? error.message : "Could not open this guest project." }; }
  }, [id, snapshot]);
  if (snapshot === "__server__") return <main className="overview-main"><p className="form-hint">Loading this browser session…</p></main>;
  if (result.error) return <main className="overview-main"><div className="form-error" role="alert">{result.error}</div><Link href="/guest" className="text-link"><ArrowLeft size={14} />Back to guest projects</Link></main>;
  if (!result.project) return <main className="overview-main"><div className="action-message"><CircleAlert size={16} />This guest project is not available in this browser session. Guest projects do not sync between browser sessions or devices.</div><Link href="/guest" className="text-link"><ArrowLeft size={14} />Back to guest projects</Link></main>;
  return <ProjectEditor key={id} initial={result.project} guestMode />;
}
