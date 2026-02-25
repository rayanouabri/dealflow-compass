import { motion } from "framer-motion";
import { Globe, Clock, Layers, BarChart3 } from "lucide-react";

const toolStats = [
  { icon: Globe, value: "100+", label: "requêtes par analyse" },
  { icon: Clock, value: "~5 min", label: "de traitement complet" },
  { icon: Layers, value: "2 phases", label: "Search + IA" },
  { icon: BarChart3, value: "10+", label: "catégories analysées" },
];

export function SocialProofBar() {
  return (
    <section className="border-y border-border bg-card/30 py-10 overflow-hidden">
      <div className="container max-w-7xl mx-auto px-4">
        <motion.p 
          className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-wider"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Un pipeline d'analyse puissant
        </motion.p>
        
        <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
          {toolStats.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex flex-col items-center gap-1.5"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <item.icon className="w-5 h-5 text-primary mb-1" />
              <span className="text-xl font-bold text-foreground">{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
