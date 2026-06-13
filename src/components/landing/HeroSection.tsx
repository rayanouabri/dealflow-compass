import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onStartTrial: () => void;
  onWatchDemo: () => void;
  trialRemaining: number;
}

export function HeroSection({ onStartTrial, onWatchDemo, trialRemaining }: HeroSectionProps) {
  return (
    <section className="pt-20 pb-24 md:pt-28 md:pb-32 border-b border-border/70">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          {/* Copy */}
          <div className="lg:col-span-6 max-w-xl">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-6">
              Sourcing pour fonds d'investissement
            </p>

            <h1 className="font-display text-[2.5rem] md:text-[3.25rem] font-medium tracking-tight text-foreground leading-[1.08] mb-6">
              Le deal flow que votre thèse mérite.
            </h1>

            <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed mb-8">
              AIVC croise douze canaux de signaux faibles, brevets, embauches, open source,
              recherche académique, pour identifier les startups alignées avec votre thèse,
              puis produit un rapport de due diligence où chaque affirmation est sourcée.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-6">
              <Button
                size="lg"
                onClick={onStartTrial}
                className="gap-2 h-11 px-6 text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
              >
                Lancer une analyse
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={onWatchDemo}
                className="h-11 px-4 text-sm text-muted-foreground hover:text-foreground"
              >
                Voir la méthode
              </Button>
            </div>

            <p className="text-[13px] text-muted-foreground">
              Compte gratuit · analyses illimitées · sans carte bancaire.
            </p>
          </div>

          {/* Report preview */}
          <div className="lg:col-span-6 lg:pl-6">
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-[0_1px_0_0_hsl(var(--border))]">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">
                  Rapport de due diligence
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  généré en 2 min 14 s
                </span>
              </div>

              <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-medium text-foreground">Neoflux Energy</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Stockage thermique industriel · Grenoble · Seed
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Score thèse 87 / 100
                </span>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                {[
                  { label: "Levée totale", value: "2,1 M€" },
                  { label: "Effectif", value: "14" },
                  { label: "Brevets", value: "3 (EPO)" },
                ].map(({ label, value }) => (
                  <div key={label} className="px-5 py-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 space-y-3">
                {[
                  {
                    label: "Équipe",
                    text: "2 cofondateurs ex-CEA, 11 ans de recherche en thermodynamique appliquée.",
                    source: "hal.science",
                  },
                  {
                    label: "Signal",
                    text: "8 recrutements ingénierie en 90 jours, dépôt de brevet EPO en mars.",
                    source: "linkedin.com",
                  },
                  {
                    label: "Marché",
                    text: "Décarbonation de la chaleur industrielle, 12 Md€ en Europe d'ici 2030.",
                    source: "iea.org",
                  },
                ].map(({ label, text, source }) => (
                  <div key={label} className="flex gap-3">
                    <span className="shrink-0 w-14 text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-0.5">
                      {label}
                    </span>
                    <p className="text-[13px] text-foreground/90 leading-relaxed">
                      {text}{" "}
                      <span className="text-[11px] text-muted-foreground underline decoration-border underline-offset-2">
                        {source}
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">31 sources vérifiées</span>
                <span className="text-[11px] text-muted-foreground">Recommandation : approfondir</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 text-right">
              Exemple de rapport, données illustratives.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
