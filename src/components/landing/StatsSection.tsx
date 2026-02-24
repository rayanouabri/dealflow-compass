import { motion } from "framer-motion";
import { Target, Clock, Building2, ThumbsUp } from "lucide-react";

const stats = [
  { 
    value: "300+",
    label: "Startups analysées",
    icon: Target,
    description: "Startups analysées sur la plateforme"
  },
  {
    value: "10 min",
    label: "Temps moyen d'analyse",
    icon: Clock,
    description: "Temps moyen pour une due diligence complète"
  },
  {
    value: "15+",
    label: "Fonds VC intégrés",
    icon: Building2,
    description: "Partech, Breega, Elaia, Index Ventures…"
  },
  {
    value: "98%",
    label: "Satisfaction utilisateurs",
    icon: ThumbsUp,
    description: "Taux de satisfaction des analystes VC"
  },
];

export function StatsSection() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container max-w-7xl mx-auto px-4 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              className="text-center p-8 rounded-2xl bg-card/80 border border-primary/40 backdrop-blur-sm glow-ai-vc relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03, borderColor: "hsl(var(--primary) / 0.5)", boxShadow: "0 0 30px rgba(48,100%,55%,0.3)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
              <div className="relative z-10">
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-4 glow-ai-vc" />
                <p className="text-4xl md:text-5xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-base font-semibold text-foreground mb-2">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
