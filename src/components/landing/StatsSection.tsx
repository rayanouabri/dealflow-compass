import { motion } from "framer-motion";
import { Target } from "lucide-react";

const stats = [
  { 
    value: "300", 
    label: "Startups analysées",
    icon: Target,
    description: "Startups analysées sur la plateforme"
  },
];

export function StatsSection() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container max-w-7xl mx-auto px-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 md:gap-8 max-w-sm mx-auto">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              className="text-center p-6 rounded-2xl bg-card/80 border border-border"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, borderColor: "hsl(var(--primary) / 0.3)" }}
            >
              <stat.icon className="w-6 h-6 text-primary mx-auto mb-3" />
              <p className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm font-medium text-foreground/80 mb-1">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
