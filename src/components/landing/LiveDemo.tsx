import { useEffect, useState } from "react";
import { Loader2, Check, Sparkles } from "lucide-react";

// Démo animée : simule un run réel du pipeline (thèse → sourcing multi-source →
// scoring orienté qualité VC → pick → due diligence sourcée → verdict), en boucle.
// Données illustratives. Animation pure CSS (tailwindcss-animate) + state.

type Ev = {
  stage: string;
  text: string;
  tag?: string;            // source citée
  score?: number;          // pour les candidats
  tone?: "pick" | "note" | "verdict" | "dim";
};

const EVENTS: Ev[] = [
  { stage: "Thèse", text: "Deeptech · IA · Seed → Série A · France", tone: "dim" },
  { stage: "Sourcing", text: "Google · Dealroom · INSEE · GitHub · Station F · French Tech" },
  { stage: "Sourcing", text: "1 240 sociétés scannées — 38 réellement on-thesis" },
  { stage: "Scoring", text: "Helion Materials — équipe 88 · moat 84 · marché 90", score: 91 },
  { stage: "Scoring", text: "Cortex Photonics — équipe 74 · moat 70 · marché 82", score: 79, tone: "dim" },
  { stage: "Scoring", text: "Écartées : trop financées / hors-thèse — la notoriété n'est pas un critère", tone: "note" },
  { stage: "Sélection", text: "Helion Materials · Grenoble · Seed", tone: "pick" },
  { stage: "Due diligence", text: "Thèse : densité énergétique × 3 vs Li-ion d'ici 2027 = le pari", tag: "—" },
  { stage: "Due diligence", text: "Équipe : 2 cofondateurs ex-CEA, 11 ans de R&D matériaux", tag: "hal.science" },
  { stage: "Due diligence", text: "Moat : 3 brevets EPO déposés en 2025 sur l'électrolyte solide", tag: "espacenet" },
  { stage: "Due diligence", text: "Marché : 12 Md€ stockage industriel UE d'ici 2030, CAGR 18 %", tag: "iea.org" },
  { stage: "Verdict", text: "INVEST conditionnel · confiance moyenne · 28 sources vérifiées", tone: "verdict" },
];

export function LiveDemo() {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (n >= EVENTS.length) {
      const t = setTimeout(() => setN(0), 2800); // pause puis reboucle
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((x) => x + 1), n === 0 ? 550 : 760);
    return () => clearTimeout(t);
  }, [n]);

  const done = n >= EVENTS.length;
  const shown = EVENTS.slice(0, n);
  const stage = done ? "Rapport prêt" : EVENTS[Math.min(n, EVENTS.length - 1)].stage;
  const pct = Math.round((Math.min(n, EVENTS.length) / EVENTS.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_1px_0_0_hsl(var(--border))]">
      {/* Barre d'état */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {done ? (
            <Check className="w-3.5 h-3.5 text-success shrink-0" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground truncate">
            {stage}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {done ? "terminé" : "analyse en cours"}
        </span>
      </div>

      {/* Progression */}
      <div className="h-0.5 bg-border/60">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Flux d'événements (stream) */}
      <div className="px-5 py-4 min-h-[320px] space-y-2">
        {shown.map((e, i) => (
          <div
            key={i}
            className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <span className="shrink-0 w-24 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {e.stage}
            </span>
            <div className="min-w-0 flex-1">
              {e.tone === "pick" ? (
                <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[13px] font-semibold text-foreground">{e.text}</span>
                </div>
              ) : (
                <p
                  className={`text-[13px] leading-relaxed ${
                    e.tone === "note"
                      ? "text-muted-foreground italic"
                      : e.tone === "verdict"
                      ? "text-success font-medium"
                      : e.tone === "dim"
                      ? "text-muted-foreground"
                      : "text-foreground/90"
                  }`}
                >
                  {e.text}
                  {e.tag && e.tag !== "—" && (
                    <span className="ml-1.5 text-[11px] text-muted-foreground underline decoration-border underline-offset-2">
                      {e.tag}
                    </span>
                  )}
                </p>
              )}
            </div>
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

      <div className="px-5 py-2.5 border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Exemple — données illustratives</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">~2 min en réel</span>
      </div>
    </div>
  );
}
