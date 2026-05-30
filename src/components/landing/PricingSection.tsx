import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Zap, ArrowRight, Sparkles } from "lucide-react";

interface PricingSectionProps {
  onStartTrial: () => void;
}

const plans = [
  {
    name: "Découverte",
    price: "0",
    period: "/mois",
    description: "Pour tester l'outil sur 5 deals",
    features: [
      "5 sourcings + due diligences",
      "8 catégories de signaux faibles",
      "Export Markdown",
      "Historique 30 jours",
      "Support email",
    ],
    cta: "Démarrer gratuitement",
    popular: false,
    note: "Sans carte bancaire",
  },
  {
    name: "Pro",
    price: "99",
    period: "/mois",
    description: "Pour les analystes & investisseurs solo",
    features: [
      "50 analyses complètes / mois",
      "12 canaux de signaux croisés",
      "Détection brevets + spin-offs",
      "Export PDF + Markdown",
      "Historique illimité",
      "Cache partagé (analyses 60% moins chères)",
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
    description: "Pour les fonds, family offices, corporate VC",
    features: [
      "Analyses illimitées",
      "Multi-utilisateurs (équipe)",
      "Thèses fonds personnalisées",
      "Intégration portfolio existant",
      "API + webhooks",
      "Account manager dédié",
      "White-label disponible",
      "SLA + onboarding équipe",
    ],
    cta: "Parler à l'équipe",
    popular: false,
    note: "Démo personnalisée + onboarding fonds",
  },
];

export function PricingSection({ onStartTrial }: PricingSectionProps) {
  return (
    <section className="py-24 md:py-32 relative" id="pricing">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/20 backdrop-blur-sm">
              Tarifs
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Simple. Transparent.
              <span className="block text-gradient-ai-vc">Pensé pour les VCs.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Commencez gratuitement, passez Pro quand vous voulez plus de deals, contactez-nous pour votre fonds.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className={`relative p-7 rounded-2xl border overflow-hidden backdrop-blur-sm flex flex-col ${
                plan.popular
                  ? "bg-card/90 border-primary/70 shadow-[0_0_40px_rgba(48,100%,55%,0.25)] md:scale-[1.04] z-10"
                  : "bg-card/70 border-primary/30"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground glow-ai-vc border-2 border-background">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Le plus choisi
                </Badge>
              )}

              <div className="mb-6 relative z-10">
                <h3 className="text-2xl font-bold mb-1 text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>
                <div className="flex items-baseline gap-1.5">
                  {plan.price !== "Sur mesure" && plan.price !== "0" && <span className="text-lg text-muted-foreground">€</span>}
                  {plan.price === "0" && <span className="text-lg text-muted-foreground">€</span>}
                  <span className="text-5xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent leading-none">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-7 relative z-10 flex-1">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="relative z-10 space-y-2">
                <Button
                  className={`w-full gap-2 h-12 ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc"
                      : "border-primary/40 hover:border-primary/60 hover:bg-primary/10"
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={onStartTrial}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                {plan.note && (
                  <p className="text-[11px] text-center text-muted-foreground">{plan.note}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-center text-sm text-muted-foreground mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Annulation à tout moment</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Stockage en EU (Supabase Ireland)</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Données VC privées non utilisées pour l'entraînement</span>
        </motion.p>
      </div>
    </section>
  );
}
