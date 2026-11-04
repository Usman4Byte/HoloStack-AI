import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { privatePage } from "@/server/http/page";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const { actor } = await privatePage(async () => null);
  return <WorkspaceShell active="setup" user={actor}><main className="setup-main">
    <Link href="/dashboard" className="text-link"><ArrowLeft size={14} />Back to workspace</Link>
    <div className="eyebrow">WORKSPACE OPERATIONS</div>
    <h1>A reliable foundation<br /><span>for every design.</span></h1>
    <p className="setup-lede">Core services are configured securely outside the product interface. Use these checks when preparing a workspace or reviewing a release.</p>
    <div className="setup-grid">
      <section className="setup-steps">
        <article><span className="setup-step">01</span><div><h2>Prepare your environment</h2><p>Keep development, preview, and production environments separate. Use private service accounts with only the access each environment needs.</p></div></article>
        <article><span className="setup-step">02</span><div><h2>Protect configuration</h2><p>Store connection details and AI access credentials in encrypted, server-side deployment settings. Never place secrets in browser code, architecture diagrams, prompts, or source control.</p></div></article>
        <article><span className="setup-step">03</span><div><h2>Verify before changes</h2><p>Confirm service connectivity and compatibility before changing production data. HoloStack does not apply infrastructure or data-schema changes automatically.</p></div></article>
        <article><span className="setup-step">04</span><div><h2>Plan for operations</h2><p>Before production use, assign an owner for availability monitoring, recovery checks, and incident response. This page does not expose live infrastructure details.</p></div></article>
      </section>
      <aside className="setup-aside">
        <div className="readiness-card"><ShieldCheck size={27} className="setup-icon" /><h3>Private by design</h3><p>Workspace members see product capabilities and project data, not deployment credentials or internal service configuration.</p><div className="boundary"><LockKeyhole size={15} />Sensitive settings stay server-side</div><div className="boundary"><Check size={15} />Changes require explicit action</div><div className="boundary"><Check size={15} />Guest work stays in its browser session</div></div>
        <div className="preview-warning"><span className="eyebrow">PRODUCTION READINESS</span><h3>Review the safeguards<br />before launch.</h3><p>Availability, recovery, and service ownership should be verified for the environment where the application runs.</p><Link href="/settings" className="text-link">Review account security<ArrowUpRight size={14} /></Link></div>
      </aside>
    </div>
    <Button asChild><Link href="/guest">Try the guest workspace<ArrowUpRight size={15} /></Link></Button>
  </main></WorkspaceShell>;
}
