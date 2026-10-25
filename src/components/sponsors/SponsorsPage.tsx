"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, Check, ChevronRight,
  CircleDashed, FileText, MessageCircle, Search, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { sponsors, type Sponsor } from "./data";
import type { FalkorSponsorStatus } from "@/features/falkordb/types";
import "./sponsors.css";
import "./falkor-sponsor.css";

type Filter = "All" | "In the app" | "Planned";
const filters: Filter[] = ["All", "In the app", "Planned"];
const builtSponsors = sponsors.filter(sponsor => sponsor.implemented);
const plannedSponsors = sponsors.filter(sponsor => !sponsor.implemented);
const journey = [
  { title: "Before you meet", description: "Give your twin context. Find common ground.", brands: ["brightdata", "openai", "falkordb"], icon: Sparkles },
  { title: "During the conversation", description: "Save captions with your permission.", brands: ["omi"], icon: MessageCircle },
  { title: "After the hello", description: "Turn what you learned into a personal magazine.", brands: ["gemini"], icon: FileText },
];

const logoPath = (id: string) => `/sponsors/${id === "brightdata" ? "brightdata-logo" : id}.png`;

function SponsorLogo({ sponsor, size = 30 }: { sponsor: Sponsor; size?: number }) {
  return (
    <span className="sponsor-logo" style={{ background: sponsor.color }}>
      <Image src={logoPath(sponsor.id)} alt="" width={size} height={size} />
    </span>
  );
}

function SponsorCard({ sponsor, configured, verified, onSelect }: {
  sponsor: Sponsor;
  configured: boolean;
  verified: boolean;
  onSelect: (sponsor: Sponsor) => void;
}) {
  return (
    <article className="sponsor-card">
      <div className="sponsor-card-top">
        <div className="sponsor-brand"><SponsorLogo sponsor={sponsor} /><div><h3>{sponsor.name}</h3><span>{sponsor.category}</span></div></div>
        <span className={`sponsor-badge ${configured ? "has-setup" : ""}`}>
          {configured ? <Check size={12} /> : <CircleDashed size={12} />}
          {verified ? "Live verified" : configured ? "Setup added" : "Setup needed"}
        </span>
      </div>
      <h4>{sponsor.tagline}</h4>
      <p className="sponsor-description">{sponsor.description}</p>
      <dl className="sponsor-card-data">
        <div><dt>Data it receives</dt><dd>{sponsor.sharedData}</dd></div>
        <div><dt>What you get</dt><dd>{sponsor.result}</dd></div>
      </dl>
      <div className="sponsor-card-bottom">
        <span>{sponsor.feature}</span>
        <button onClick={() => onSelect(sponsor)} aria-label={`How we use ${sponsor.name}`}>How we use it <ArrowRight size={15} /></button>
      </div>
    </article>
  );
}

export default function SponsorsPage({ configured }: { configured: Record<string, boolean> }) {
  const [falkor, setFalkor] = useState<FalkorSponsorStatus | null>(null);
  useEffect(() => {
    if (!configured.falkordb) return;
    const controller = new AbortController();
    void fetch("/api/integrations/falkordb/status", { signal: controller.signal })
      .then(response => { if (!response.ok) throw Error("Graph unavailable"); return response.json(); })
      .then((value: FalkorSponsorStatus) => setFalkor(value))
      .catch(() => { if (!controller.signal.aborted) setFalkor({ status: "unavailable", graph: "conference", checkedAt: new Date().toISOString() }); });
    return () => controller.abort();
  }, [configured.falkordb]);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Sponsor | null>(null);
  const visible = sponsors.filter(sponsor =>
    (filter === "All" || (filter === "In the app" ? sponsor.implemented : !sponsor.implemented)) &&
    `${sponsor.name} ${sponsor.category} ${sponsor.description} ${sponsor.feature} ${sponsor.tagline}`.toLowerCase().includes(query.toLowerCase().trim()),
  );
  const visibleBuilt = visible.filter(sponsor => sponsor.implemented);
  const visiblePlanned = visible.filter(sponsor => !sponsor.implemented);
  const status = (sponsor: Sponsor) => !sponsor.implemented ? "Planned" : configured[sponsor.id] ? "Setup added" : "Setup needed";

  const connectionStatus = (sponsor: Sponsor) => sponsor.id === "falkordb"
    ? !configured.falkordb ? "Setup needed" : !falkor ? "Checking…" : falkor.status === "passed" ? "Live verified" : "Unavailable"
    : "Not checked";

  function exportOverview() {
    const report = sponsors.map(sponsor => ({ ...sponsor, configuration: status(sponsor), connectivity: connectionStatus(sponsor), ...(sponsor.id === "falkordb" ? { graphEvidence: falkor } : {}), usageMetrics: "Not instrumented" }));
    const url = URL.createObjectURL(new Blob([JSON.stringify({
      note: "Technology overview; no company endorsement implied. Setup does not verify connectivity.",
      sponsors: report,
    }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "meaningfulmeet-sponsors.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="sponsors-page">
      <section className="sponsor-hero" aria-labelledby="sponsors-title">
        <div className="sponsor-hero-copy">
          <span className="sponsor-eyebrow">SPONSORS & TECHNOLOGY</span>
          <h1 id="sponsors-title">Behind every<br /><span>meaningful hello.</span></h1>
          <p>A few great tools help bring MeaningfulMeet to life.<br className="sponsor-desktop-break" /> Here’s what we use, why it matters, and what data is shared.</p>
          <div className="sponsor-hero-summary"><span><Check size={13} /> {builtSponsors.length} integrations built</span><i aria-hidden="true" /><span>{plannedSponsors.length} planned</span></div>
        </div>
        <div className="sponsor-hero-art" aria-hidden="true">
          <span className="sponsor-orbit sponsor-orbit-outer" /><span className="sponsor-orbit sponsor-orbit-inner" />
          <span className="sponsor-art-center"><span className="sponsor-art-symbol"><span /><span /><span /></span></span>
          {builtSponsors.map(sponsor => <span key={sponsor.id} className={`sponsor-art-logo sponsor-art-${sponsor.id}`}><SponsorLogo sponsor={sponsor} size={33} /></span>)}
          <span className="sponsor-art-caption">Good tools. Human connections.</span>
        </div>
      </section>

      <section className="sponsor-journey" aria-label="Where the tools help">
        {journey.map((step, index) => <div className="sponsor-journey-step" key={step.title}>
          <div className="sponsor-step-title"><span>0{index + 1}</span><step.icon size={16} /><h2>{step.title}</h2>{index < journey.length - 1 && <ChevronRight className="sponsor-step-arrow" size={17} />}</div>
          <p>{step.description}</p>
          <div className="sponsor-step-brands">{step.brands.map(id => {
            const sponsor = sponsors.find(item => item.id === id)!;
            return <button key={id} onClick={() => setSelected(sponsor)} aria-label={`How we use ${sponsor.name}`}><Image src={logoPath(id)} alt="" width={16} height={16} />{sponsor.name}</button>;
          })}</div>
        </div>)}
      </section>

      <section className="sponsor-directory" aria-labelledby="sponsor-directory-title">
        <div className="sponsor-directory-heading"><div><h2 id="sponsor-directory-title">Meet the tools</h2><p>What each one brings to your experience.</p></div><button className="sponsor-export" onClick={exportOverview}><ArrowDownToLine size={14} /> Export overview</button></div>
        <div className="sponsor-toolbar">
          <div className="sponsor-filters" aria-label="Filter integrations">{filters.map(item => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}<span>{item === "All" ? sponsors.length : item === "In the app" ? builtSponsors.length : plannedSponsors.length}</span></button>)}</div>
          <div className="sponsor-search"><Search size={16} /><input aria-label="Search sponsors" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sponsors…" />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</div>
        </div>
        <p className="sr-only" role="status">{visible.length} integrations found</p>
        {visibleBuilt.length > 0 && <section className="sponsor-built" aria-labelledby="sponsor-built-title">
          <div className="sponsor-group-heading"><h3 id="sponsor-built-title"><span /> In the app <small>{visibleBuilt.length}</small></h3><p>Features are built. External services may still need setup.</p></div>
          <div className="sponsor-grid">{visibleBuilt.map(sponsor => <SponsorCard key={sponsor.id} sponsor={sponsor} configured={Boolean(configured[sponsor.id])} verified={sponsor.id === "falkordb" && falkor?.status === "passed"} onSelect={setSelected} />)}</div>
          <p className="sponsor-setup-note"><CircleDashed size={13} /> “Setup added” means configuration is present. “Live verified” means the graph check returned a real path. Other connections have not been checked.</p>
        </section>}
        {visiblePlanned.length > 0 && <section className="sponsor-planned" aria-labelledby="sponsor-planned-title">
          <div className="sponsor-group-heading"><h3 id="sponsor-planned-title"><span /> On the roadmap <small>{visiblePlanned.length}</small></h3><p>Intended tools for future work. Not part of the current app.</p></div>
          <div className="sponsor-planned-list">{visiblePlanned.map(sponsor => <button className="sponsor-planned-row" key={sponsor.id} onClick={() => setSelected(sponsor)} aria-label={`View plans for ${sponsor.name}`}>
            <SponsorLogo sponsor={sponsor} size={25} /><span className="sponsor-planned-name">{sponsor.name}<small>{sponsor.category}</small></span><span className="sponsor-planned-purpose">{sponsor.tagline}</span><span className="sponsor-planned-label">Planned</span><ArrowUpRight size={16} />
          </button>)}</div>
        </section>}
        {visible.length === 0 && <div className="sponsor-empty"><Search size={26} /><h3>No sponsors found</h3><p>Try a different name or clear your filters.</p><button onClick={() => { setQuery(""); setFilter("All"); }}>Show all sponsors <ArrowRight size={14} /></button></div>}
      </section>

      <aside className="sponsor-transparency"><span className="sponsor-trust-icon"><ShieldCheck size={24} strokeWidth={1.5} /></span><div><h2>Your data has a purpose. You should know it.</h2><p>Open any tool to see what it receives and what stays private. Usage and cost tracking are not available yet. Logos identify the tools; they don’t imply company endorsement.</p></div><Link href="/settings/privacy">Privacy settings <ArrowUpRight size={14} /></Link></aside>

      <Dialog open={selected !== null} onClose={() => setSelected(null)} title={selected ? `${selected.implemented ? "How we use" : "Plans for"} ${selected.name}` : "Integration details"} variant="wide">
        {selected && <div className="sponsor-detail">
          <div className="sponsor-detail-intro"><SponsorLogo sponsor={selected} size={30} /><div><span>{selected.category}</span><h3>{selected.tagline}</h3></div></div>
          <p className="sponsor-detail-description">{selected.description}</p>
          <div className="sponsor-detail-status"><span>Feature<strong>{selected.implemented ? "Built · optional" : "Planned"}</strong></span><span>Setup<strong>{status(selected)}</strong></span><span>Connection<strong>{connectionStatus(selected)}</strong></span></div>
          {selected.id === "falkordb" && <section className="sponsor-falkor-proof" aria-label="FalkorDB live evidence" aria-live="polite">
            <h3>Every connection has a path.</h3>
            {!configured.falkordb ? <p>Add the server’s FalkorDB connection to enable graph evidence.</p> : !falkor ? <p>Checking the conference graph…</p> : falkor.status !== "passed" ? <p>The live graph check is unavailable. Your local conference experience is still available.</p> : <>
              <p>Live TLS query · <strong>conference</strong> · fictional conference dataset</p>
              <dl><div><dt>Nodes</dt><dd>{falkor.counts?.nodes}</dd></div><div><dt>Relationships</dt><dd>{falkor.counts?.edges}</dd></div><div><dt>Demo nodes</dt><dd>{falkor.counts?.namespaceNodes}</dd></div></dl>
              {falkor.paths?.map(path => <div className="sponsor-falkor-path" key={path.names.join("/")}><p>{path.names.map((name, index) => `${index ? (path.relations[index - 1] === "INTERESTED_IN" ? " → " : " ← ") : ""}${name}`).join("")}</p><span>{path.relations.join(" · ")} · {path.hops} hops{path.room ? ` · ${path.room}` : ""}</span></div>)}
              <small>Checked {new Date(falkor.checkedAt).toLocaleString()} · cached for up to 60 seconds. Counts cover the full graph; demo nodes identify our synthetic dataset.</small>
              <a href="https://browser.falkordb.com" target="_blank" rel="noopener noreferrer">Explore in FalkorDB Browser <ArrowUpRight size={14} /></a>
            </>}
          </section>}
          <div className="sponsor-data-flow"><div><span>WHAT IT RECEIVES</span><p>{selected.input}</p></div><ArrowRight size={18} /><div><span>WHAT IT RETURNS</span><p>{selected.output}</p></div></div>
          <div className="sponsor-detail-boundary"><ShieldCheck size={18} /><div><h3>What stays protected</h3><p>{selected.boundary}</p></div></div>
          <details className="sponsor-evidence"><summary>Technical reference</summary><code>{selected.evidence}</code></details>
          <div className="sponsor-detail-links">{selected.href && <Link className="btn btn-primary" href={selected.href} onClick={() => setSelected(null)}>{selected.id === "gemini" ? "Try the magazine demo" : "Open the feature"}<ArrowRight size={14} /></Link>}<a className="btn btn-secondary" href={selected.website} target="_blank" rel="noopener noreferrer">Visit {selected.name}<ArrowUpRight size={14} /></a></div>
        </div>}
      </Dialog>
    </div>
  );
}
