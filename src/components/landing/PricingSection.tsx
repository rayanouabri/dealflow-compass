import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Zap, ArrowRight } from "lucide-react";

interface PricingSectionProps {
  onStartTrial: () => void;
}

const plans = [
  {
    name: "Starter",
    price: "29",
    period: "/mois",
    description: "Pour les fondateurs en phase d'exploration",
    features: [
      "10 analyses de fonds/mois",
      "5 pitch decks générés",
      "Export Markdown",
      "Support email",
    ],
    cta: "Commencer gratuit",
    popular: false
  },
  {
    name: "Pro",
    price: "99",
    period: "/mois",
    description: "Pour les startups en levée active",
    features: [
      "Analyses illimitées",
      "Pitch decks illimités",
      "Export PDF & PowerPoint",
      "Dashboard de suivi complet",
      "Intégrations CRM",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    period: "",
    description: "Pour les accélérateurs et fonds VC",
    features: [
      "Tout Pro inclus",
      "Multi-utilisateurs",
      "API access",
      "IA personnalisée",
      "Account manager dédié",
      "White-label disponible",
    ],
    cta: "Contacter l'équipe",
    popular: false
  },
];

export function PricingSection({ onStartTrial }: PricingSectionProps) {
  return (
    <section className="py-24 md:py-32 bg-card/30 border-y border-border" id="pricing">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
              Tarifs
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Simple et transparent
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Commencez gratuitement. Passez Pro quand vous êtes prêt à accélérer.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className={`relative p-6 rounded-2xl border ${
                plan.popular 
                  ? 'bg-card border-primary/50 shadow-lg shadow-primary/10' 
                  : 'bg-card border-border'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  <Zap className="w-3 h-3 mr-1" />
                  Le plus populaire
                </Badge>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  {plan.price !== "Sur mesure" && <span className="text-sm text-muted-foreground">€</span>}
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full gap-2" 
                variant={plan.popular ? "default" : "outline"}
                onClick={onStartTrial}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Money back guarantee */}
        <motion.p 
          className="text-center text-sm text-muted-foreground mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          ✓ Annulation à tout moment • ✓ Garantie satisfait ou remboursé 30 jours
        </motion.p>
      </div>
    </section>
  );
}
