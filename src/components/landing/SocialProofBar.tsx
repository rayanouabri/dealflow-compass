import { motion } from "framer-motion";

const logos = [
  { name: "Y Combinator", logo: "YC" },
  { name: "Sequoia", logo: "SEQ" },
  { name: "a16z", logo: "a16z" },
  { name: "Techstars", logo: "TS" },
  { name: "500 Global", logo: "500" },
  { name: "Founders Fund", logo: "FF" },
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
          Utilisé par des startups financées par
        </motion.p>
        
        <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
          {logos.map((item, i) => (
            <motion.div
              key={item.name}
              className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 0.4, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ opacity: 0.7 }}
            >
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-foreground/70">
                {item.logo}
              </div>
              <span className="text-sm font-medium text-foreground/70 hidden sm:block">{item.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
