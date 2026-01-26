import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Zap, ArrowRight } from "lucide-react";

interface PricingSectionProps {
  onStartTrial: () => void;
}

const plans = [
  {
    name: "Gratuit",
    price: "Gratuit",
    period: "",
    description: "Pour commencer",
    features: [
      "5 analyses de startups",
      "Rapports de due diligence",
      "Export Markdown & PDF",
      "Support email",
    ],
    cta: "Commencer gratuit",
    popular: false
  },
  {
    name: "Sur mesure",
    price: "Sur mesure",
    period: "",
    description: "Pour les fonds VC et family offices",
    features: [
      "Analyses illimitées",
      "Due diligence complète",
      "Export PDF & PowerPoint",
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
    <section className="py-24 md:py-32 relative" id="pricing">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/20 backdrop-blur-sm">
              Tarifs
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Simple et transparent
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Commencez gratuitement. Passez Pro quand vous êtes prêt à accélérer.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className={`relative p-8 rounded-2xl border overflow-hidden backdrop-blur-sm ${
                plan.popular 
                  ? 'bg-card/80 border-primary/60 shadow-lg shadow-primary/30 glow-ai-vc' 
                  : 'bg-card/70 border-primary/40'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground glow-ai-vc border-2 border-background">
                  <Zap className="w-3 h-3 mr-1" />
                  Le plus populaire
                </Badge>
              )}
              
              <div className="mb-6 relative z-10">
                <h3 className="text-2xl font-bold mb-2 text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  {plan.price !== "Sur mesure" && plan.price !== "Gratuit" && <span className="text-sm text-muted-foreground">€</span>}
                  <span className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-6 relative z-10">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full gap-2 h-12 relative z-10 ${plan.popular ? 'bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc' : 'border-primary/40 hover:border-primary/60 hover:bg-primary/10'}`}
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
          className="text-center text-sm text-muted-foreground mt-10 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="text-primary">✓</span> Annulation à tout moment • <span className="text-primary">✓</span> Garantie satisfait ou remboursé 30 jours
        </motion.p>
      </div>
    </section>
  );
}
