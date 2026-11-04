import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, ChartNoAxesCombined, CircleHelp, FileDown, GitCompareArrows, Network, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import { PublicHeader } from "@/components/public-header";
import { MarketingArchitecturePreview } from "@/components/marketing-architecture-preview";
import { MarketingSimulation } from "@/components/marketing-simulation";
import { Button } from "@/components/ui/button";
import { templates } from "@/domain/architecture/templates";
import { architectureSvg } from "@/domain/architecture/studio";

const steps = [
  ["01", "Describe the system", "Start with a blank diagram, an authored template, or a clear product brief."],
  ["02", "Shape the architecture", "Place components, connect real boundaries, and document technologies and assumptions."],
  ["03", "Explore the model", "Adjust traffic inputs and inspect how modeled load flows through the graph."],
  ["04", "Review the design", "Use deterministic rules for findings; ask Gemini only when you want reasoning."],
  ["05", "Keep the decisions", "Compare versions, save scenarios, and export a diagram or engineering report."],
] as const;

const features = [
  { icon: Sparkles, title: "AI architecture proposals", body: "Turn a written brief into a validated graph when you explicitly request generation. Review every assumption before you apply it." },
  { icon: Network, title: "HoloCanvas", body: "Edit components and connections directly. The diagram stays responsive and all graph changes are local until saved." },
  { icon: ChartNoAxesCombined, title: "ScaleLab", body: "Model workload, capacity, and bottlenecks with transparent deterministic calculations and editable assumptions." },
  { icon: ShieldCheck, title: "Architecture review", body: "Read evidence-based findings from named TypeScript rules. No opaque composite score or simulated security certification." },
  { icon: GitCompareArrows, title: "Version history", body: "Track saved revisions, compare graph changes, and restore a previous design as a new version." },
  { icon: FileDown, title: "Useful exports", body: "Download validated architecture JSON, a clear PNG diagram, or a Markdown engineering report." },
];

const principles = [
  ["Show the assumptions", "Capacity numbers are user-editable inputs, not benchmark claims."],
  ["Keep the math deterministic", "Simulation, review rules, graph editing, and visualization run in ordinary code."],
  ["Keep people in control", "AI changes remain proposals until someone reviews and applies them."],
  ["Protect the design", "Private projects are tenant-scoped; guest projects stay in the current browser session."],
] as const;

const questions = [
  ["What does HoloStack AI do?", "It gives you a workspace to draw software architecture, document design assumptions, estimate capacity under a modeled workload, run named architecture checks, and review AI proposals."],
  ["Does it generate actual application code?", "No. HoloStack designs and documents architecture graphs. It does not generate, deploy, or operate a production application."],
  ["Are traffic simulations real load tests?", "No. ScaleLab runs deterministic calculations against the graph and explicit capacity assumptions. It does not connect to or measure infrastructure."],
  ["Can I use the product without AI?", "Yes. Canvas editing, templates, exports, architecture review, version comparison, and ScaleLab do not require Gemini."],
  ["Can I export an architecture?", "Yes. The studio supports validated JSON import/export, PNG diagrams, and Markdown reports."],
  ["Is there a free demo?", "You can open the guest workspace without signing up. Guest work is stored in this browser tab session; create an account for durable project storage in your TiDB workspace."],
] as const;

const featured = templates[0];

function svgData(graph: (typeof templates)[number]) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(architectureSvg(graph).svg)}`;
}

export default function HomePage() {
  return <>
    <PublicHeader />
    <main className="public-main">
      <section className="welcome-hero">
        <div>
          <p className="eyebrow">AI-POWERED SOFTWARE ARCHITECTURE</p>
          <h1>Build better <span>systems.</span> Before you code.</h1>
          <p className="welcome-hero-copy">Turn software ideas into interactive architectures. Understand every component, explore capacity under stated assumptions, and improve your design with AI when you ask for it.</p>
          <div className="welcome-actions">
            <Button asChild><Link href="/guest">Start designing <ArrowRight size={16} /></Link></Button>
            <Button asChild variant="outline"><Link href="#product-preview">Explore the workspace <ArrowDownRight size={16} /></Link></Button>
          </div>
          <p className="welcome-note"><ShieldCheck size={15} /> Start without an account. Guest projects are kept in this browser session.</p>
        </div>
        <MarketingArchitecturePreview />
      </section>

      <section className="landing-section landing-intro" aria-label="Product summary">
        <strong>Architecture is easier to reason about when the system is visible.</strong>
        <p>Plan the important boundaries before implementation. Keep choices, trade-offs, and assumptions beside the diagram.</p>
      </section>

      <section className="welcome-workflow" id="how-it-works">
        <div className="landing-section">
          <p className="eyebrow">A CLEAR PATH FROM IDEA TO MODEL</p>
          <h2>Think it through.<br />Then build with intent.</h2>
          <ol className="workflow-steps">{steps.map(([number, title, description]) => <li key={number}>
            <span className="workflow-number">{number}<ArrowUpRight size={14} /></span>
            <h3>{title}</h3><p>{description}</p>
          </li>)}</ol>
        </div>
      </section>

      <section className="landing-section section-space" id="features">
        <div className="section-heading"><div><p className="eyebrow">THE ENGINEERING WORKSPACE</p><h2>Useful by design.<br />Honest by default.</h2></div><p>HoloStack combines a hands-on architecture editor with deterministic analysis and optional, user-requested AI reasoning.</p></div>
        <div className="feature-editorial">
          <div className="feature-copy"><p className="eyebrow">01 / SEE THE SYSTEM</p><h2>One canvas for the pieces that matter.</h2><p>Arrange services, databases, queues, identity boundaries, and external providers. Select a component to edit it; connect graph nodes with clear contracts and keep the system yours.</p><Link href="/guest" className="text-link">Open the guest workspace <ArrowRight size={15} /></Link></div>
          <div className="feature-visual"><Image unoptimized src={svgData(featured)} alt={`Real ${featured.name} template diagram`} width={900} height={540} /></div>
        </div>
        <div className="feature-editorial reverse">
          <div className="feature-copy"><p className="eyebrow">02 / MODEL THE WORKLOAD</p><h2>See what your inputs imply.</h2><p>Move a traffic control and HoloStack recomputes utilization locally. Every result follows the architecture graph and its editable capacity assumptions; no AI request or infrastructure telemetry is involved.</p><a href="#simulation" className="text-link">Try the deterministic model <ArrowRight size={15} /></a></div>
          <div className="feature-metric"><span className="eyebrow">MODELLED, NOT MEASURED</span><strong>Inputs <em>→</em> insights</strong><p>Capacity, utilization, and headroom are estimates that help explore a design. They are not load-test results or production guarantees.</p></div>
        </div>
        <div className="feature-list">{features.map(({ icon: Icon, title, body }) => <article key={title}><Icon size={18} /><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="landing-section section-space" id="templates">
        <div className="section-heading"><div><p className="eyebrow">REAL, EDITABLE STARTING POINTS</p><h2>Start with a system,<br />not a blank page.</h2></div><p>These diagrams are authored product templates. Open one in the guest workspace, then edit the graph and its assumptions.</p></div>
        <div className="template-grid">{templates.map(template => <Link className="template-card" href={`/guest?template=${encodeURIComponent(template.id)}`} key={template.id}>
          <div className="template-card-preview" role="img" aria-label={`${template.name} diagram preview`} style={{ backgroundImage: `url("${svgData(template)}")` }} />
          <div className="template-card-body"><strong>{template.name}</strong><p>{template.description}</p><span className="text-link">Open this template <ArrowUpRight size={14} /></span></div>
        </Link>)}</div>
      </section>

      <section className="landing-section section-space" id="simulation">
        <div className="section-heading"><div><p className="eyebrow">SCALELAB · PURE TYPESCRIPT</p><h2>Change the load.<br />Watch the model respond.</h2></div><p>Try a small, interactive view of the same deterministic simulation engine used in project workspaces.</p></div>
        <MarketingSimulation />
      </section>

      <section className="landing-section section-space" aria-labelledby="principles-title">
        <div className="section-heading"><div><p className="eyebrow">HOW WE THINK ABOUT ENGINEERING</p><h2 id="principles-title">Trust comes from<br />showing the work.</h2></div><p>No borrowed logos, invented customer claims, or mystery scores. Product output stays inspectable.</p></div>
        <div className="principles-grid">{principles.map(([title, body], index) => <article key={title}><span className="workflow-number">0{index + 1}</span><strong>{title}</strong><p>{body}</p></article>)}</div>
      </section>

      <section className="landing-section section-space" id="faq">
        <div className="section-heading"><div><p className="eyebrow"><CircleHelp size={14} /> GOOD QUESTIONS</p><h2>Before you begin.</h2></div></div>
        <div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="landing-section final-cta" id="get-started">
        <div><p className="eyebrow">MAKE YOUR NEXT DESIGN LEGIBLE</p><h2>Your next big system starts with <span>a better plan.</span></h2></div>
        <Button asChild><Link href="/guest">Start designing <ArrowRight size={16} /></Link></Button>
      </section>
    </main>
    <footer className="public-footer"><div><Link href="/" className="brand"><Boxes size={20} /><span>HoloStack<span className="brand-ai">AI</span></span></Link><p>An architecture workspace for clear diagrams, transparent estimates, and reviewed decisions.</p></div><nav aria-label="Footer navigation"><Link href="#features">Features</Link><Link href="#templates">Templates</Link><Link href="/guest">Guest workspace</Link><Link href="/login">Log in</Link><Link href="/signup">Create account</Link></nav><small>© {new Date().getFullYear()} HoloStack AI · Design models, not deployed infrastructure.</small></footer>
  </>;
}
