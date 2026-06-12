import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface DashboardPreviewProps {
  onStartTrial: () => void;
}

const sections = [
  { name: "Résumé exécutif", detail: "Recommandation, points forts, risques clés" },
  { name: "Financements", detail: "Levées, valorisation, investisseurs, métriques" },
  { name: "Équipe", detail: "Fondateurs, parcours, dirigeants clés" },
  { name: "Marché", detail: "TAM / SAM / SOM, CAGR, tendances" },
  { name: "Concurrence", detail: "Paysage, avantage concurrentiel, moat" },
  { name: "Risques", detail: "Marché, exécution, financier, réglementaire" },
];

export function DashboardPreview({ onStartTrial }: DashboardPreviewProps) {
  return (
    <section className="py-20 md:py-28 border-b border-border/70" id="report">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-start">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-4">
              Le rapport
            </p>
            <h2 className="font-display text-3xl md:text-[2.25rem] font-medium tracking-tight text-foreground leading-tight">
              Un mémo structuré, pas une conversation.
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mt-4 max-w-md">
              Huit sections, le format d'une note d'investissement interne. Chaque chiffre,
              chaque affirmation renvoie vers une source cliquable : presse, registres,
              LinkedIn, bases de brevets. Ce qui n'a pas pu être vérifié est signalé comme tel.
            </p>
            <Button
              onClick={onStartTrial}
              variant="outline"
              className="mt-8 h-10 px-5 gap-2 text-sm border-border text-foreground hover:bg-secondary"
            >
              Générer un premier rapport
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">
                  Sommaire du rapport
                </span>
                <span className="text-[11px] text-muted-foreground">Export Markdown</span>
              </div>
              <div className="divide-y divide-border">
                {sections.map((s, i) => (
                  <div key={s.name} className="px-5 py-3.5 flex items-baseline gap-4">
                    <span className="text-[12px] text-muted-foreground tabular-nums w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium text-foreground w-40 shrink-0">
                      {s.name}
                    </span>
                    <span className="text-[13px] text-muted-foreground truncate">{s.detail}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  + Recommandation, sources agrégées, assistant de relance
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
