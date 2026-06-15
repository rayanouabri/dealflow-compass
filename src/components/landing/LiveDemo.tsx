import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";

// Démo animée : un run réel joué en boucle. Phase "run" (process : thèse →
// sourcing → scoring qualité VC) qui fond en croisé vers une CARTE DE RAPPORT
// (anneau de score, métriques, insights sourcés, verdict). Données illustratives.

type Ev = { stage: string; text: string; score?: number; tone?: "note" | "dim" };

const RUN: Ev[] = [
  { stage: "Thèse", text: "Deeptech · IA · Seed → Série A · France", tone: "dim" },
  { stage: "Sourcing", text: "Google · Dealroom · INSEE · GitHub · Station F · French Tech" },
  { stage: "Sourcing", text: "1 240 sociétés scannées — 38 réellement on-thesis" },
  { stage: "Scoring", text: "Helion Materials — équipe 88 · moat 84 · marché 90", score: 91 },
  { stage: "Scoring", text: "Cortex Photonics — équipe 74 · moat 70 · marché 82", score: 79, tone: "dim" },
  { stage: "Filtre", text: "Écartées : trop financées / hors-thèse — la notoriété n'est pas un critère", tone: "note" },
];

const METRICS = [
  { label: "Levée totale", value: "2,1 M€" },
  { label: "Effectif", value: "14" },
  { label: "Brevets", value: "3 (EPO)" },
];

const INSIGHTS = [
  { label: "Équipe", text: "2 cofondateurs ex-CEA, 11 ans de R&D en matériaux.", src: "hal.science" },
  { label: "Moat", text: "3 brevets EPO déposés en 2025 sur l'électrolyte solide.", src: "espacenet" },
  { label: "Marché", text: "Stockage thermique industriel : 12 Md€ en Europe d'ici 2030.", src: "iea.org" },
];

const RING_C = 97.39; // circonférence (r = 15.5)

export function LiveDemo() {
  const [phase, setPhase] = useState<"run" | "report">("run");
  const [step, setStep] = useState(0);
  const [ring, setRing] = useState(0);

  useEffect(() => {
    if (phase === "run") {
      if (step < RUN.length) {
        const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 450 : 700);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("report"), 650);
      return () => clearTimeout(t);
    }
    // report : on remplit l'anneau, on tient, puis on reboucle
    const grow = setTimeout(() => setRing(91), 140);
    const loop = setTimeout(() => {
      setRing(0);
      setStep(0);
      setPhase("run");
    }, 5400);
    return () => {
      clearTimeout(grow);
      clearTimeout(loop);
    };
  }, [phase, step]);

  const running = phase === "run";
  const pct = running ? Math.round((step / RUN.length) * 72) : 100;
  const stage = running ? RUN[Math.min(step, RUN.length - 1)].stage : "Rapport d'investissement";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_18px_50px_-20px_rgba(0,0,0,0.6)]">
      {/* Barre d'état */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {running ? (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
          ) : (
            <Check className="w-3.5 h-3.5 text-success shrink-0" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground truncate">
            {stage}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {running ? "analyse en cours" : "généré en 2 min 11 s"}
        </span>
      </div>
      <div className="h-0.5 bg-border/60">
        <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>

      {/* Corps : fondu croisé run ↔ rapport, hauteur fixe (zéro saut) */}
      <div className="relative h-[376px]">
        {/* RUN */}
        <div
          className={`absolute inset-0 px-5 py-4 space-y-2.5 transition-opacity duration-500 ${
            running ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {RUN.slice(0, step).map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <span className="shrink-0 w-20 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {e.stage}
              </span>
              <p
                className={`min-w-0 flex-1 text-[13px] leading-relaxed ${
                  e.tone === "note"
                    ? "text-muted-foreground italic"
                    : e.tone === "dim"
                    ? "text-muted-foreground"
                    : "text-foreground/90"
                }`}
              >
                {e.text}
              </p>
              {typeof e.score === "number" && (
                <span
                  className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                    e.tone === "dim"
                      ? "border border-border text-muted-foreground"
                      : "border border-primary/40 bg-primary/10 text-primary"
                  }`}
                >
                  {e.score}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* RAPPORT */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            running ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-border">
            <div className="min-w-0">
              <p className="font-display text-xl font-medium text-foreground leading-tight">Helion Materials</p>
              <p className="text-xs text-muted-foreground mt-1">Stockage thermique industriel · Grenoble · Seed</p>
              <span className="mt-2.5 inline-flex items-center rounded-md border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                INVEST conditionnel
              </span>
            </div>
            <div className="relative shrink-0 w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C - (RING_C * ring) / 100}
                  style={{ transition: "stroke-dashoffset 1.1s ease-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-base font-semibold text-foreground tabular-nums leading-none">91</span>
                <span className="text-[8px] text-muted-foreground mt-0.5">/ 100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            {METRICS.map((m) => (
              <div key={m.label} className="px-4 py-2.5">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="px-5 py-3.5 space-y-3">
            {INSIGHTS.map((it) => (
              <div key={it.label} className="flex gap-3">
                <span className="shrink-0 w-12 text-[10px] font-medium uppercase tracking-wider text-muted-foreground pt-0.5">
                  {it.label}
                </span>
                <p className="min-w-0 flex-1 text-[12.5px] text-foreground/90 leading-relaxed">
                  {it.text}{" "}
                  <span className="text-[11px] text-muted-foreground underline decoration-border underline-offset-2">
                    {it.src}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-2.5 border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {running ? "Exemple — données illustratives" : "28 sources vérifiées · export PDF"}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">~2 min en réel</span>
      </div>
    </div>
  );
}
