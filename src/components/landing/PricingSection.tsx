import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PricingSectionProps {
  onStartTrial: () => void;
}

const plans = [
  {
    name: "Découverte",
    price: "0 €",
    period: "",
    description: "Pour évaluer l'outil sur cinq deals.",
    features: [
      "5 sourcings + due diligences",
      "8 catégories de signaux faibles",
      "Export Markdown",
      "Historique 30 jours",
      "Support email",
    ],
    cta: "Commencer gratuitement",
    popular: false,
    note: "Sans carte bancaire",
  },
  {
    name: "Pro",
    price: "99 €",
    period: "/ mois",
    description: "Pour les analystes et investisseurs solo.",
    features: [
      "50 analyses complètes par mois",
      "12 canaux de signaux croisés",
      "Détection brevets et spin-offs",
      "Export PDF et Markdown",
      "Historique illimité",
      "Cache partagé entre analyses",
      "Support prioritaire",
    ],
    cta: "Commencer Pro",
    popular: true,
    note: "Essai 14 jours, annulation à tout moment",
  },
  {
    name: "Fund",
    price: "Sur mesure",
    period: "",
    description: "Pour les fonds, family offices, corporate VC.",
    features: [
      "Analyses illimitées",
      "Multi-utilisateurs",
      "Thèses de fonds personnalisées",
      "Intégration du portfolio existant",
      "API et webhooks",
      "Account manager dédié",
      "SLA et onboarding équipe",
    ],
    cta: "Parler à l'équipe",
    popular: false,
    note: "Démo personnalisée",
  },
];

export function PricingSection({ onStartTrial }: PricingSectionProps) {
  return (
    <section className="py-20 md:py-28 border-b border-border/70" id="pricing">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-4">
            Tarifs
          </p>
          <h2 className="font-display text-3xl md:text-[2.25rem] font-medium tracking-tight text-foreground leading-tight">
            Un prix par siège, pas par deal.
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mt-4">
            Commencez gratuitement, passez en Pro quand le volume suit. Les fonds nous
            contactent directement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border bg-card p-7 flex flex-col ${
                plan.popular ? "border-foreground/30" : "border-border"
              }`}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground uppercase tracking-wider">
                    {plan.name}
                  </h3>
                  {plan.popular && (
                    <span className="text-[11px] font-medium text-primary border border-primary/40 rounded px-2 py-0.5">
                      Recommandé
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-medium text-foreground leading-none">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground mt-3">{plan.description}</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <Button
                  className={`w-full h-10 text-sm font-medium ${
                    plan.popular
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "border-border text-foreground hover:bg-secondary"
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={onStartTrial}
                >
                  {plan.cta}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">{plan.note}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[13px] text-muted-foreground mt-10 flex flex-wrap gap-x-6 gap-y-2">
          <span>Annulation à tout moment</span>
          <span>Données hébergées en Europe (Supabase, Irlande)</span>
          <span>Vos deals ne servent jamais à entraîner de modèles</span>
        </p>
      </div>
    </section>
  );
}
