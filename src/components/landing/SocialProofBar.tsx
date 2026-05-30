import { motion } from "framer-motion";
import { Github, FileText, Linkedin, Rocket, Database, Award } from "lucide-react";

const sources = [
  { name: "LinkedIn", icon: Linkedin, hint: "founders / hiring bursts" },
  { name: "Crunchbase", icon: Database, hint: "fundings / portfolios" },
  { name: "GitHub", icon: Github, hint: "open-source traction" },
  { name: "INPI / EPO", icon: FileText, hint: "brevets early-stage" },
  { name: "ProductHunt", icon: Rocket, hint: "launches récents" },
  { name: "arXiv / HAL", icon: Award, hint: "spin-offs recherche" },
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
          12+ canaux de signaux faibles agrégés — pour trouver les startups avant Crunchbase
        </motion.p>

        <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
          {sources.map((src, i) => (
            <motion.div
              key={src.name}
              className="flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 0.6, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ opacity: 1 }}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <src.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-foreground/90">{src.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:block">{src.hint}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
