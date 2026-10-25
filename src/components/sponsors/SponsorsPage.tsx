"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, Layers3, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { sponsors, type Sponsor } from "./data";
import "./sponsors.css";

type Filter = "All partners" | "Implemented" | "Planned";
const filters: Filter[] = ["All partners", "Implemented", "Planned"];

export default function SponsorsPage({ configured }: { configured: Record<string, boolean> }) {
  const [filter, setFilter] = useState<Filter>("All partners");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Sponsor | null>(null);
  const implemented = sponsors.filter(s => s.implemented).length;
  const visible = sponsors.filter(s =>
    (filter === "All partners" || (filter === "Implemented" ? s.implemented : !s.implemented)) &&
    `${s.name} ${s.category} ${s.description} ${s.feature}`.toLowerCase().includes(query.toLowerCase().trim()),
  );
  const status = (s: Sponsor) => !s.implemented ? "Planned" : configured[s.id] ? "Configured" : "Needs configuration";

  function exportOverview() {
    const report = sponsors.map(s => ({ ...s, configuration: status(s), connectivity: "Not checked", usageMetrics: "Not instrumented" }));
    const url = URL.createObjectURL(new Blob([JSON.stringify({ note: "Technology integration overview; no company endorsement implied. Configuration does not verify connectivity.", sponsors: report }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "meaningfulmeet-sponsors.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="sponsors-page">
      <nav className="sponsor-breadcrumb" aria-label="Breadcrumb"><Link href="/">MeaningfulMeet</Link><span>/</span><span>Sponsors & integrations</span></nav>
      <section className="sponsor-hero">
        <div>
          <span className="sponsor-eyebrow"><span /> THE TECHNOLOGY BEHIND THE HELLO</span>
          <h1>Good connections.<br /><span>Great company.</span></h1>
          <p>Meet the tools helping us make conferences a little more human.<br className="sponsor-desktop-break" /> Explore what each one does, where it fits, and how data flows.</p>
        </div>
        <div className="sponsor-hero-aside"><span className="sponsor-hero-icon"><Layers3 size={27} strokeWidth={1.3} /></span><p>Thoughtfully connected.<br /><strong>Transparently built.</strong></p><button onClick={exportOverview}><ArrowDownToLine size={14} /> Export overview</button></div>
      </section>

      <div className="sponsor-stats" aria-label="Integration overview">
        <div><span>Technology partners</span><strong>{sponsors.length.toString().padStart(2, "0")}<small>in our ecosystem</small></strong></div>
        <div><span>Implemented integrations</span><strong>{implemented.toString().padStart(2, "0")}<small>optional, configuration required</small></strong></div>
        <div><span>Configured services</span><strong>{Object.values(configured).filter(Boolean).length.toString().padStart(2, "0")}<small>connectivity not checked</small></strong></div>
        <div className="sponsor-stat-trust"><ShieldCheck size={25} strokeWidth={1.3} /><div><strong>Your data, by choice.</strong><span>See exactly what each tool receives.</span></div></div>
      </div>

      <section aria-labelledby="sponsor-directory-title" className="sponsor-directory">
        <div className="sponsor-section-heading"><div><span className="sponsor-eyebrow">OUR ECOSYSTEM</span><h2 id="sponsor-directory-title">Small pieces. Meaningful possibilities.</h2></div><span className="sponsor-directory-count">{sponsors.length} technologies, one human experience</span></div>
        <div className="sponsor-toolbar"><div className="sponsor-filters" aria-label="Filter integrations">{filters.map(item => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}<span>{item === "All partners" ? sponsors.length : item === "Implemented" ? implemented : sponsors.length - implemented}</span></button>)}</div><label className="sponsor-search"><Search size={15} /><span className="sr-only">Search integrations</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a partner…" />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</label></div>
        <p className="sr-only" role="status">{visible.length} integrations found</p>
        <div className="sponsor-grid">
          {visible.map(s => <article className="sponsor-card" key={s.id}>
            <div className="sponsor-card-top"><span className="sponsor-logo" style={{ background: s.color }}><Image src={`/sponsors/${s.id}.png`} alt={`${s.name} logo`} width={30} height={30} /></span><span className={`sponsor-badge ${s.implemented ? "is-implemented" : ""}`}>{s.implemented ? <Check size={11} /> : <span className="sponsor-planned-dot" />}{s.implemented ? "Implemented" : "Planned"}</span></div>
            <span className="sponsor-category">{s.category}</span><h3>{s.name}</h3><p className="sponsor-tagline">{s.tagline}</p><p className="sponsor-description">{s.description}</p>
            <div className="sponsor-card-meta"><span>WHERE IT FITS</span><strong>{s.feature}</strong></div>
            <button className="sponsor-card-action" onClick={() => setSelected(s)} aria-label={`Explore ${s.name} integration`}>Explore integration <ArrowUpRight size={16} /></button>
          </article>)}
        </div>
        {visible.length === 0 && <div className="sponsor-empty"><Search size={26} /><h3>No partners found</h3><p>Try another name or explore the full ecosystem.</p><button onClick={() => { setQuery(""); setFilter("All partners"); }}>Clear filters <ArrowRight size={14} /></button></div>}
      </section>
      <aside className="sponsor-transparency"><Sparkles size={23} strokeWidth={1.4} /><div><h2>Built with intention. Shared with clarity.</h2><p>These are our technology integrations and intended tools; logos do not imply endorsement. Configuration is not proof of a successful connection. API call counts, costs, and usage analytics are not instrumented yet.</p></div><Link href="/settings/privacy">Our privacy approach <ArrowUpRight size={14} /></Link></aside>
      <Dialog open={selected !== null} onClose={() => setSelected(null)} title={selected ? `${selected.name} · ${selected.category}` : "Integration details"} variant="wide">
        {selected && <div className="sponsor-detail"><div className="sponsor-detail-intro"><Image src={`/sponsors/${selected.id}.png`} alt={`${selected.name} logo`} width={42} height={42} /><p>{selected.description}</p></div><div className="sponsor-detail-status"><span>Implementation<strong>{selected.implemented ? "Implemented · optional" : "Planned"}</strong></span><span>Configuration<strong>{status(selected)}</strong></span><span>Connectivity<strong>Not checked</strong></span></div><div className="sponsor-data-flow"><h3>How the data flows</h3><div><span>01 · INPUT</span><p>{selected.input}</p></div><ArrowRight size={17} /><div><span>02 · OUTPUT</span><p>{selected.output}</p></div></div><div className="sponsor-detail-boundary"><ShieldCheck size={18} /><div><h3>Data boundaries</h3><p>{selected.boundary}</p></div></div><div className="sponsor-evidence"><span>IMPLEMENTATION REFERENCE</span><code>{selected.evidence}</code></div><div className="sponsor-detail-links">{selected.href && <Link className="btn btn-primary" href={selected.href} onClick={() => setSelected(null)}>Explore the feature <ArrowRight size={14} /></Link>}<a className="btn btn-secondary" href={selected.website} target="_blank" rel="noopener noreferrer">Visit {selected.name} <ArrowUpRight size={14} /></a></div></div>}
      </Dialog>
    </div>
  );
}
