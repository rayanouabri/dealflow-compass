// Investment memo — continuous, document-style rendering of a due-diligence
// report. Replaces the cramped tab layout: every block wraps its text, long
// "estimation" sentences (TAM/SAM, culture, hiring) flow instead of clipping,
// and a sticky section nav lets the reader jump through the memo.

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AIQAChat } from "@/components/AIQAChat";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Globe,
  Linkedin,
  ExternalLink,
  Link as LinkIcon,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";

// ─── Pure helpers ────────────────────────────────────────────────────────────

function toArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const s = o.milestone ?? o.name ?? o.title ?? o.description ?? o.text ?? o.label ?? o.value ?? o.amount ?? o.round;
    if (typeof s === "string") return s;
    if (s != null) return String(s);
    try { return JSON.stringify(value).slice(0, 150); } catch { return ""; }
  }
  return String(value);
}

function stripSources(text: string | undefined | null): string {
  if (!text || typeof text !== "string") return "";
  let s = text;
  let prev = "";
  while (prev !== s) {
    prev = s;
    const idx = s.toLowerCase().indexOf("(source:");
    if (idx === -1) break;
    const end = s.indexOf(")", idx);
    if (end === -1) break;
    s = (s.slice(0, idx).trimEnd() + " " + s.slice(end + 1).trimStart());
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

// "Non disponible (estimation : XXX)." → { text: "XXX", estimated: true }
function cleanValue(raw: unknown): { text: string; estimated: boolean } {
  let t = stripSources(toText(raw)).trim();
  if (!t) return { text: "", estimated: false };
  const lower = t.toLowerCase();
  const estimated =
    lower.includes("estimation") ||
    lower.startsWith("non disponible") ||
    lower === "n/a";
  const m = t.match(/^non disponible\s*\(estimation\s*:?\s*([\s\S]+?)\)\.?$/i);
  if (m) t = m[1].trim();
  else {
    const m2 = t.match(/^\(estimation\s*:?\s*([\s\S]+?)\)\.?$/i);
    if (m2) t = m2[1].trim();
  }
  if (/^non disponible\.?$/i.test(t) || t.toLowerCase() === "n/a") {
    return { text: "Non communiqué", estimated: true };
  }
  return { text: t, estimated };
}

function shortenUrl(url: string, max = 48): string {
  try {
    const u = new URL(url);
    const full = u.hostname.replace(/^www\./, "") + u.pathname;
    return full.length <= max ? full : full.slice(0, max - 1) + "…";
  } catch {
    return url.length > max ? url.slice(0, max - 1) + "…" : url;
  }
}

// ─── Small presentational atoms ──────────────────────────────────────────────

function EstBadge() {
  return (
    <span className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground align-middle">
      est.
    </span>
  );
}

// Body prose that always wraps. `value` may carry an "estimation" wrapper.
function Prose({ value, className = "" }: { value: unknown; className?: string }) {
  const { text, estimated } = cleanValue(value);
  if (!text) return null;
  return (
    <p className={`text-[15px] leading-[1.75] text-foreground/90 break-words [overflow-wrap:anywhere] ${className}`}>
      {text} {estimated && <EstBadge />}
    </p>
  );
}

function SectionTitle({ id, icon, children }: { id: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <h2 className="font-display text-[1.4rem] font-medium tracking-tight text-foreground">{children}</h2>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 min-w-0 border-t border-border pt-10 first:border-t-0 first:pt-0">
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-2">{children}</p>
  );
}

// A stat that can hold either a short number or a full sentence — text wraps.
function Stat({ label, value }: { label: string; value: unknown }) {
  const { text, estimated } = cleanValue(value);
  if (!text) return null;
  const short = text.length <= 24;
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{label}</p>
      <p className={`${short ? "text-lg font-semibold" : "text-sm leading-relaxed"} text-foreground break-words [overflow-wrap:anywhere]`}>
        {text} {estimated && <EstBadge />}
      </p>
    </div>
  );
}

function BulletList({ items, tone = "neutral" }: { items: unknown[]; tone?: "neutral" | "positive" | "negative" }) {
  const dot = tone === "positive" ? "bg-success" : tone === "negative" ? "bg-destructive" : "bg-muted-foreground/50";
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => {
        const { text, estimated } = cleanValue(it);
        if (!text) return null;
        return (
          <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/90 break-words [overflow-wrap:anywhere]">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{text} {estimated && <EstBadge />}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SourceChips({ sources }: { sources?: { name?: string; url?: string }[] }) {
  const list = (sources || []).filter((s) => s?.url);
  if (list.length === 0) return null;
  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-2.5 flex items-center gap-2">
        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Sources ({list.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={s.url}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LinkIcon className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[180px]">{s.name || shortenUrl(s.url!)}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
          </a>
        ))}
      </div>
    </div>
  );
}

function recoBadge(rec?: string) {
  switch (rec?.toUpperCase()) {
    case "INVEST":
      return <Badge variant="outline" className="border-success/40 bg-success/5 font-medium tracking-wide text-success"><CheckCircle2 className="mr-1.5 h-3 w-3" /> INVEST</Badge>;
    case "WATCH":
      return <Badge variant="outline" className="border-primary/40 bg-primary/5 font-medium tracking-wide text-primary"><AlertTriangle className="mr-1.5 h-3 w-3" /> WATCH</Badge>;
    case "PASS":
      return <Badge variant="outline" className="border-destructive/40 bg-destructive/5 font-medium tracking-wide text-destructive"><XCircle className="mr-1.5 h-3 w-3" /> PASS</Badge>;
    default:
      return rec ? <Badge variant="outline">{rec}</Badge> : null;
  }
}

function riskBadge(level?: string) {
  const l = (level || "").toLowerCase();
  if (l.includes("low") || l.includes("faible")) return <Badge variant="outline" className="border-success/40 bg-success/5 font-normal text-success">Risque faible</Badge>;
  if (l.includes("high") || l.includes("élevé") || l.includes("eleve")) return <Badge variant="outline" className="border-destructive/40 bg-destructive/5 font-normal text-destructive">Risque élevé</Badge>;
  if (l) return <Badge variant="outline" className="border-primary/40 bg-primary/5 font-normal text-primary">Risque modéré</Badge>;
  return null;
}

// ─── Main component ──────────────────────────────────────────────────────────

interface MemoProps {
  data: any;
  companyName: string;
  onExport: () => void;
}

export function InvestmentMemo({ data, companyName, onExport }: MemoProps) {
  const company = data.company ?? {};
  const es = data.executiveSummary ?? {};
  const name = company.name || companyName;

  // Aggregate sources across every section for the final list.
  const allSources = useMemo(() => {
    const byUrl = new Map<string, { name: string; url: string; type?: string; relevance?: string }>();
    const add = (s: { name?: string; url?: string; type?: string; relevance?: string } | null) => {
      if (!s?.url || byUrl.has(s.url)) return;
      byUrl.set(s.url, { name: s.name || shortenUrl(s.url), url: s.url, type: s.type, relevance: s.relevance });
    };
    (data.allSources || []).forEach(add);
    [data.product, data.market, data.financials, data.team, data.competition, data.traction, data.risks, data.opportunities]
      .forEach((sec: any) => (sec?.sources || []).forEach(add));
    return Array.from(byUrl.values());
  }, [data]);

  // Build the table of contents from sections that actually have content.
  const toc = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    items.push({ id: "summary", label: "Résumé exécutif" });
    if (data.product && Object.keys(data.product).length) items.push({ id: "product", label: "Produit" });
    if (data.market && Object.keys(data.market).length) items.push({ id: "market", label: "Marché" });
    if (data.competition && Object.keys(data.competition).length) items.push({ id: "competition", label: "Concurrence" });
    if (data.team && Object.keys(data.team).length) items.push({ id: "team", label: "Équipe" });
    if (data.traction && Object.keys(data.traction).length) items.push({ id: "traction", label: "Traction" });
    if (data.financials && Object.keys(data.financials).length) items.push({ id: "financials", label: "Financements" });
    if (data.risks && Object.keys(data.risks).length) items.push({ id: "risks", label: "Risques" });
    if (data.opportunities && Object.keys(data.opportunities).length) items.push({ id: "opportunities", label: "Opportunités" });
    if (data.investmentRecommendation && Object.keys(data.investmentRecommendation).length) items.push({ id: "reco", label: "Recommandation" });
    if (data.investmentCommittee && Object.keys(data.investmentCommittee).length) items.push({ id: "committee", label: "Comité d'investissement" });
    if (allSources.length) items.push({ id: "sources", label: "Sources" });
    items.push({ id: "assistant", label: "Assistant IA" });
    return items;
  }, [data, allSources.length]);

  const [active, setActive] = useState<string>("summary");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]?.target?.id) setActive(vis[0].target.id);
      },
      { rootMargin: "-72px 0px -65% 0px", threshold: 0 },
    );
    toc.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [toc]);

  const metaFacts = [
    cleanValue(company.sector).text,
    cleanValue(company.stage).text,
    cleanValue(company.headquarters).text,
    company.founded ? `Fondée en ${cleanValue(company.founded).text}` : "",
    company.employeeCount ? `${cleanValue(company.employeeCount).text} employés` : "",
  ].filter(Boolean);

  const rec = data.investmentRecommendation ?? {};
  const fin = data.financials ?? {};
  const market = data.market ?? {};

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Sticky TOC rail */}
      <aside className="order-2 lg:order-1 lg:col-span-3">
        <div className="lg:sticky lg:top-20 space-y-4">
          <div className="flex flex-col gap-2">
            <Button onClick={onExport} size="sm" className="gap-2 bg-foreground text-background hover:bg-foreground/90">
              <Download className="h-4 w-4" /> Exporter le rapport
            </Button>
            <div className="flex flex-wrap gap-2">
              {company.website && (
                <Button variant="outline" size="sm" asChild className="border-border text-xs">
                  <a href={company.website} target="_blank" rel="noopener noreferrer"><Globe className="mr-1.5 h-3.5 w-3.5" /> Site</a>
                </Button>
              )}
              {company.linkedinUrl && (
                <Button variant="outline" size="sm" asChild className="border-border text-xs">
                  <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="mr-1.5 h-3.5 w-3.5" /> LinkedIn</a>
                </Button>
              )}
            </div>
          </div>
          <nav className="hidden lg:block border-l border-border">
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors ${
                  active === t.id
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Memo body */}
      <article className="order-1 min-w-0 space-y-10 lg:order-2 lg:col-span-9">
        {/* Masthead */}
        <header className="min-w-0">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Mémo d'investissement
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground break-words md:text-4xl">
              {name}
            </h1>
            {recoBadge(es.recommendation)}
          </div>
          {company.tagline && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
              {stripSources(company.tagline)}
            </p>
          )}
          {metaFacts.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
              {metaFacts.map((f, i) => (
                <span key={i} className="flex items-center gap-3">
                  {f}
                  {i < metaFacts.length - 1 && <span className="text-border">·</span>}
                </span>
              ))}
            </div>
          )}
          {/* Key metrics strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Recommandation" value={es.recommendation} />
            <Stat label="Total levé" value={fin.totalFunding} />
            <Stat label="Valorisation" value={fin.latestValuation} />
            <Stat label="Confiance" value={es.confidenceLevel} />
          </div>
        </header>

        {/* Executive summary */}
        <Section id="summary">
          <SectionTitle id="summary" icon={<Sparkles className="h-5 w-5" />}>Résumé exécutif</SectionTitle>
          <Prose value={es.overview} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {toArray(es.keyHighlights).length > 0 && (
              <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                <Label><span className="text-success">Points forts</span></Label>
                <BulletList items={toArray(es.keyHighlights)} tone="positive" />
              </div>
            )}
            {toArray(es.keyRisks).length > 0 && (
              <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                <Label><span className="text-destructive">Risques clés</span></Label>
                <BulletList items={toArray(es.keyRisks)} tone="negative" />
              </div>
            )}
          </div>
        </Section>

        {/* Product */}
        {data.product && Object.keys(data.product).length > 0 && (
          <Section id="product">
            <SectionTitle id="product">Produit & technologie</SectionTitle>
            <div className="space-y-5">
              <Prose value={data.product.description} />
              {data.product.valueProposition && (
                <div className="rounded-lg border border-border bg-muted/20 p-5">
                  <Label>Proposition de valeur</Label>
                  <Prose value={data.product.valueProposition} />
                </div>
              )}
              {data.product.technology && (
                <div><Label>Technologie</Label><Prose value={data.product.technology} /></div>
              )}
              {data.product.patents && (
                <div><Label>Propriété intellectuelle</Label><Prose value={data.product.patents} /></div>
              )}
              {toArray(data.product.keyFeatures).length > 0 && (
                <div>
                  <Label>Fonctionnalités clés</Label>
                  <div className="flex flex-wrap gap-2">
                    {toArray(data.product.keyFeatures).map((f, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">{cleanValue(f).text}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <SourceChips sources={data.product.sources} />
          </Section>
        )}

        {/* Market */}
        {data.market && Object.keys(data.market).length > 0 && (
          <Section id="market">
            <SectionTitle id="market">Marché</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Stat label="TAM" value={market.tam} />
              <Stat label="SAM" value={market.sam} />
              <Stat label="SOM" value={market.som} />
              <Stat label="CAGR" value={market.cagr} />
            </div>
            {market.analysis && (
              <div className="mt-5"><Label>Analyse</Label><Prose value={market.analysis} /></div>
            )}
            {toArray(market.trends).length > 0 && (
              <div className="mt-5">
                <Label>Tendances</Label>
                <BulletList items={toArray(market.trends)} />
              </div>
            )}
            <SourceChips sources={market.sources} />
          </Section>
        )}

        {/* Competition */}
        {data.competition && Object.keys(data.competition).length > 0 && (
          <Section id="competition">
            <SectionTitle id="competition">Concurrence</SectionTitle>
            <div className="space-y-5">
              <Prose value={data.competition.landscape} />
              {data.competition.competitiveAdvantage && (
                <div className="rounded-lg border border-border bg-muted/20 p-5">
                  <Label>Avantage concurrentiel</Label>
                  <Prose value={data.competition.competitiveAdvantage} />
                </div>
              )}
              {data.competition.moat && (
                <div><Label>Moat / barrières</Label><Prose value={data.competition.moat} /></div>
              )}
              {toArray(data.competition.competitors).length > 0 && (
                <div className="space-y-3">
                  <Label>Concurrents principaux</Label>
                  {toArray(data.competition.competitors).map((c, i) => (
                    <div key={i} className="min-w-0 rounded-lg border border-border bg-muted/20 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground break-words">{toText(c.name)}</p>
                        {c.funding && <Badge variant="outline" className="font-normal">{toText(c.funding)}</Badge>}
                      </div>
                      {c.description && <Prose value={c.description} className="text-sm" />}
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {toArray(c.strengths).length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-success">Forces</p>
                            <BulletList items={toArray(c.strengths)} tone="positive" />
                          </div>
                        )}
                        {toArray(c.weaknesses).length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-destructive">Faiblesses</p>
                            <BulletList items={toArray(c.weaknesses)} tone="negative" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <SourceChips sources={data.competition.sources} />
          </Section>
        )}

        {/* Team */}
        {data.team && Object.keys(data.team).length > 0 && (
          <Section id="team">
            <SectionTitle id="team">Équipe & fondateurs</SectionTitle>
            <div className="space-y-5">
              <Prose value={data.team.overview} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat label="Taille d'équipe" value={data.team.teamSize} />
                <Stat label="Recrutement" value={data.team.hiringTrends} />
                <Stat label="Culture" value={data.team.culture} />
              </div>
              {toArray(data.team.founders).length > 0 && (
                <div>
                  <Label>Fondateurs</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {toArray(data.team.founders).map((f, i) => (
                      <div key={i} className="min-w-0 rounded-lg border border-border bg-muted/20 p-4">
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground break-words">{toText(f.name)}</p>
                            <p className="text-sm text-muted-foreground break-words">{toText(f.role)}</p>
                          </div>
                          {f.linkedin && typeof f.linkedin === "string" && f.linkedin.startsWith("http") && (
                            <a href={f.linkedin} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <Linkedin className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </div>
                        {f.background && <Prose value={f.background} className="text-sm" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {toArray(data.team.keyExecutives).length > 0 && (
                <div>
                  <Label>Équipe dirigeante</Label>
                  <div className="space-y-2.5">
                    {toArray(data.team.keyExecutives).map((e, i) => (
                      <div key={i} className="min-w-0 rounded-lg border border-border bg-muted/20 p-4">
                        <p className="font-medium text-foreground break-words">
                          {toText(e.name)} <span className="text-sm font-normal text-muted-foreground">— {toText(e.role)}</span>
                        </p>
                        {e.background && <Prose value={e.background} className="mt-1 text-sm" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <SourceChips sources={data.team.sources} />
          </Section>
        )}

        {/* Traction */}
        {data.traction && Object.keys(data.traction).length > 0 && (
          <Section id="traction">
            <SectionTitle id="traction" icon={<TrendingUp className="h-5 w-5" />}>Traction</SectionTitle>
            <div className="space-y-5">
              <Prose value={data.traction.overview} />
              {data.traction.customers?.count && (
                <Stat label="Clients" value={data.traction.customers.count} />
              )}
              {toArray(data.traction.customers?.notable).length > 0 && (
                <div>
                  <Label>Clients notables</Label>
                  <div className="flex flex-wrap gap-2">
                    {toArray(data.traction.customers?.notable).map((c, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">{toText(c)}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {toArray(data.traction.keyMilestones).length > 0 && (
                <div>
                  <Label>Jalons clés</Label>
                  <div className="space-y-2.5">
                    {toArray(data.traction.keyMilestones).map((m, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                        <div className="min-w-0">
                          <p className="text-[15px] leading-relaxed text-foreground/90 break-words [overflow-wrap:anywhere]">{stripSources(toText(m?.milestone))}</p>
                          {m?.date && <p className="mt-1 text-xs text-muted-foreground">{toText(m.date)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {toArray(data.traction.partnerships).length > 0 && (
                <div>
                  <Label>Partenariats</Label>
                  <div className="flex flex-wrap gap-2">
                    {toArray(data.traction.partnerships).map((p, i) => (
                      <Badge key={i} variant="outline" className="font-normal">{toText(p)}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {toArray(data.traction.awards).length > 0 && (
                <div>
                  <Label><span className="inline-flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> Récompenses</span></Label>
                  <BulletList items={toArray(data.traction.awards)} />
                </div>
              )}
            </div>
            <SourceChips sources={data.traction.sources} />
          </Section>
        )}

        {/* Financials */}
        {data.financials && Object.keys(data.financials).length > 0 && (
          <Section id="financials">
            <SectionTitle id="financials">Financements</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total levé" value={fin.totalFunding} />
              <Stat label="Valorisation" value={fin.latestValuation} />
              {fin.metrics?.arr && <Stat label="ARR" value={fin.metrics.arr} />}
              {fin.metrics?.customers && <Stat label="Clients" value={fin.metrics.customers} />}
            </div>
            {toArray(fin.fundingHistory).length > 0 && (
              <div className="mt-5">
                <Label>Historique des levées</Label>
                <div className="space-y-3">
                  {toArray(fin.fundingHistory).map((r, i) => (
                    <div key={i} className="min-w-0 rounded-lg border border-border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {r.round && <Badge variant="outline" className="font-normal">{toText(r.round)}</Badge>}
                          {r.amount && <span className="text-lg font-semibold text-primary">{toText(r.amount)}</span>}
                        </div>
                        {r.date && <span className="rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground">{toText(r.date)}</span>}
                      </div>
                      {r.valuation && <p className="mt-2 text-sm text-muted-foreground break-words">Valorisation : {toText(r.valuation)}</p>}
                      {toArray(r.investors).length > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">
                          <span className="font-medium text-foreground/85">Investisseurs : </span>
                          {toArray(r.investors).map(toText).filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fin.metrics && typeof fin.metrics === "object" && Object.keys(fin.metrics).length > 0 && (
              <div className="mt-5">
                <Label>Métriques</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.entries(fin.metrics).map(([k, v]) => (
                    <Stat key={k} label={k.replace(/([A-Z])/g, " $1").trim()} value={v} />
                  ))}
                </div>
              </div>
            )}
            <SourceChips sources={fin.sources} />
          </Section>
        )}

        {/* Risks */}
        {data.risks && Object.keys(data.risks).length > 0 && (
          <Section id="risks">
            <div className="mb-5 flex items-center justify-between gap-3">
              <SectionTitle id="risks" icon={<AlertTriangle className="h-5 w-5" />}>Risques</SectionTitle>
              <div className="shrink-0">{riskBadge(data.risks.overallRiskLevel)}</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {([
                ["marketRisks", "Risques marché"],
                ["executionRisks", "Risques d'exécution"],
                ["financialRisks", "Risques financiers"],
                ["competitiveRisks", "Risques concurrentiels"],
                ["regulatoryRisks", "Risques réglementaires"],
              ] as const).map(([key, label]) =>
                toArray(data.risks[key]).length > 0 ? (
                  <div key={key} className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                    <Label>{label}</Label>
                    <BulletList items={toArray(data.risks[key])} tone="negative" />
                  </div>
                ) : null,
              )}
            </div>
            {toArray(data.risks.mitigations).length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-muted/20 p-5">
                <Label><span className="text-success">Facteurs atténuants</span></Label>
                <BulletList items={toArray(data.risks.mitigations)} tone="positive" />
              </div>
            )}
            <SourceChips sources={data.risks.sources} />
          </Section>
        )}

        {/* Opportunities */}
        {data.opportunities && Object.keys(data.opportunities).length > 0 && (
          <Section id="opportunities">
            <SectionTitle id="opportunities">Opportunités</SectionTitle>
            <div className="space-y-5">
              {toArray(data.opportunities.growthOpportunities).length > 0 && (
                <div><Label>Leviers de croissance</Label><BulletList items={toArray(data.opportunities.growthOpportunities)} tone="positive" /></div>
              )}
              {data.opportunities.marketExpansion && (
                <div><Label>Expansion marché</Label><Prose value={data.opportunities.marketExpansion} /></div>
              )}
              {data.opportunities.productExpansion && (
                <div><Label>Expansion produit</Label><Prose value={data.opportunities.productExpansion} /></div>
              )}
              {data.opportunities.strategicValue && (
                <div><Label>Valeur stratégique</Label><Prose value={data.opportunities.strategicValue} /></div>
              )}
            </div>
            <SourceChips sources={data.opportunities.sources} />
          </Section>
        )}

        {/* Recommendation */}
        {data.investmentRecommendation && Object.keys(data.investmentRecommendation).length > 0 && (
          <Section id="reco">
            <div className="mb-5 flex items-center justify-between gap-3">
              <SectionTitle id="reco" icon={<CheckCircle2 className="h-5 w-5" />}>Recommandation</SectionTitle>
              <div className="shrink-0">{recoBadge(rec.recommendation)}</div>
            </div>
            {rec.rationale && <div className="mb-5"><Label>Justification</Label><Prose value={rec.rationale} /></div>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Multiple cible" value={rec.targetReturn} />
              <Stat label="Horizon" value={rec.investmentHorizon} />
              <Stat label="Ticket suggéré" value={rec.suggestedTicket} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {toArray(rec.strengths).length > 0 && (
                <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                  <Label><span className="text-success">Forces</span></Label>
                  <BulletList items={toArray(rec.strengths)} tone="positive" />
                </div>
              )}
              {toArray(rec.weaknesses).length > 0 && (
                <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                  <Label><span className="text-destructive">Faiblesses</span></Label>
                  <BulletList items={toArray(rec.weaknesses)} tone="negative" />
                </div>
              )}
            </div>
            {toArray(rec.keyQuestions).length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-muted/20 p-5">
                <Label>Questions à creuser</Label>
                <BulletList items={toArray(rec.keyQuestions)} />
              </div>
            )}
            {toArray(rec.suggestedNextSteps).length > 0 && (
              <div className="mt-5">
                <Label>Prochaines étapes</Label>
                <ol className="space-y-2.5">
                  {toArray(rec.suggestedNextSteps).map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/90 break-words [overflow-wrap:anywhere]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <span>{cleanValue(s).text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Section>
        )}

        {/* Comité d'investissement — analyse fine */}
        {data.investmentCommittee && Object.keys(data.investmentCommittee).length > 0 && (() => {
          const ic = data.investmentCommittee;
          const conv = String(ic.convictionLevel ?? "").toLowerCase();
          const convLabel = conv.includes("high") ? "Conviction forte" : conv.includes("low") ? "Conviction faible" : conv ? "Conviction modérée" : null;
          return (
            <Section id="committee">
              <div className="mb-5 flex items-center justify-between gap-3">
                <SectionTitle id="committee" icon={<Sparkles className="h-5 w-5" />}>Comité d'investissement</SectionTitle>
                {convLabel && (
                  <span className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium ${conv.includes("high") ? "border-success/40 text-success bg-success/5" : conv.includes("low") ? "border-destructive/40 text-destructive bg-destructive/5" : "border-primary/40 text-primary bg-primary/5"}`}>{convLabel}</span>
                )}
              </div>
              {ic.verdict && (
                <div className="mb-5 rounded-lg border-l-2 border-primary bg-muted/20 p-5">
                  <Label>Verdict</Label>
                  <Prose value={ic.verdict} className="text-foreground" />
                </div>
              )}
              {ic.thesisFitAnalysis && <div className="mb-5"><Label>Adéquation au mandat</Label><Prose value={ic.thesisFitAnalysis} /></div>}
              <div className="grid gap-4 md:grid-cols-2">
                {ic.bullCase && (
                  <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                    <Label><span className="text-success">Scénario haussier</span></Label>
                    <Prose value={ic.bullCase} className="text-sm" />
                  </div>
                )}
                {ic.bearCase && (
                  <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                    <Label><span className="text-destructive">Scénario baissier</span></Label>
                    <Prose value={ic.bearCase} className="text-sm" />
                  </div>
                )}
              </div>
              {toArray(ic.keyDebates).length > 0 && (
                <div className="mt-4"><Label>Débats clés du comité</Label><BulletList items={toArray(ic.keyDebates)} /></div>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {toArray(ic.whatMustBeTrue).length > 0 && (
                  <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                    <Label>Ce qui doit être vrai</Label>
                    <BulletList items={toArray(ic.whatMustBeTrue)} tone="positive" />
                  </div>
                )}
                {toArray(ic.killCriteria).length > 0 && (
                  <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-5">
                    <Label><span className="text-destructive">Critères rédhibitoires</span></Label>
                    <BulletList items={toArray(ic.killCriteria)} tone="negative" />
                  </div>
                )}
              </div>
              {ic.valuationView && <div className="mt-4"><Label>Vue valorisation / entrée</Label><Prose value={ic.valuationView} /></div>}
              {toArray(ic.diligencePriorities).length > 0 && (
                <div className="mt-4 rounded-lg border border-border bg-muted/20 p-5">
                  <Label>Priorités de due diligence</Label>
                  <BulletList items={toArray(ic.diligencePriorities)} />
                </div>
              )}
            </Section>
          );
        })()}

        {/* Sources */}
        {allSources.length > 0 && (
          <Section id="sources">
            <SectionTitle id="sources" icon={<LinkIcon className="h-5 w-5" />}>Sources ({allSources.length})</SectionTitle>
            <div className="space-y-2">
              {allSources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block min-w-0 rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary break-words">{s.name}</p>
                        {s.type && <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">{s.type}</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground break-all">{shortenUrl(s.url, 70)}</p>
                      {s.relevance && <p className="mt-1 text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">{s.relevance}</p>}
                    </div>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* AI assistant */}
        <Section id="assistant">
          <SectionTitle id="assistant" icon={<Sparkles className="h-5 w-5" />}>Approfondir avec l'assistant IA</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="h-[560px] w-full overflow-hidden">
              <AIQAChat
                startupData={{
                  name,
                  sector: company.sector,
                  stage: company.stage,
                  location: company.headquarters,
                  founded: company.founded,
                  teamSize: company.employeeCount,
                }}
                dueDiligenceData={data}
              />
            </div>
          </div>
        </Section>

        {data.metadata?.generatedAt && (
          <p className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            Rapport généré le {new Date(data.metadata.generatedAt).toLocaleString("fr-FR")}
            {data.metadata.searchResultsCount ? ` · ${data.metadata.searchResultsCount} résultats analysés` : ""}
          </p>
        )}
      </article>
    </div>
  );
}
