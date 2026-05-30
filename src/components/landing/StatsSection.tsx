import { motion } from "framer-motion";
import { Target, Radar, Zap, Database } from "lucide-react";

const stats = [
  {
    value: "12",
    suffix: "+",
    label: "Canaux de signaux",
    icon: Radar,
    description: "LinkedIn, brevets, GitHub, arXiv, Pappers, Show HN…",
  },
  {
    value: "100",
    suffix: "+",
    label: "Requêtes par analyse",
    icon: Database,
    description: "Sourcing multi-canal en parallèle, dédupliqué",
  },
  {
    value: "5",
    suffix: " min",
    label: "Sourcing + Due Diligence",
    icon: Zap,
    description: "Le temps qu'un analyste mettrait 2 jours à produire",
  },
  {
    value: "8",
    suffix: " catégories",
    label: "Signaux faibles tracés",
    icon: Target,
    description: "Détection pré-Crunchbase : embauches, spin-offs, IP",
  },
];

export function StatsSection() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container max-w-7xl mx-auto px-4 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              className="text-center p-6 md:p-7 rounded-2xl bg-card/80 border border-primary/30 backdrop-blur-sm relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.03, borderColor: "hsl(var(--primary) / 0.6)", boxShadow: "0 0 30px rgba(48,100%,55%,0.25)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
              <div className="relative z-10">
                <stat.icon className="w-7 h-7 text-primary mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent leading-none">
                  {stat.value}
                  <span className="text-xl md:text-2xl">{stat.suffix}</span>
                </p>
                <p className="text-sm font-semibold text-foreground mt-2 mb-1">{stat.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
