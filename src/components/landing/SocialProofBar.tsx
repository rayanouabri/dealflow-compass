import { motion } from "framer-motion";

const logos = [
  { name: "Y Combinator", logo: "YC" },
  { name: "Sequoia", logo: "SEQ" },
  { name: "a16z", logo: "a16z" },
  { name: "Techstars", logo: "TS" },
  { name: "500 Global", logo: "500" },
  { name: "Founders Fund", logo: "FF" },
  { name: "Partech", logo: "PAR" },
  { name: "Breega", logo: "BRG" },
  { name: "Elaia", logo: "ELA" },
  { name: "Balderton", logo: "BAL" },
  { name: "Index Ventures", logo: "IDX" },
  { name: "HV Capital", logo: "HVC" },
];

export function SocialProofBar() {
  return (
    <section className="border-y border-border bg-card/30 py-10 overflow-hidden">
      <div className="container max-w-7xl mx-auto px-4 mb-6">
        <motion.p 
          className="text-center text-sm text-muted-foreground uppercase tracking-wider"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Analysez des startups comme celles de ces fonds de référence
        </motion.p>
      </div>
      
      {/* Infinite marquee */}
      <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <motion.div
          className="flex gap-8 md:gap-16 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {[...logos, ...logos].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity flex-shrink-0"
            >
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-foreground/70">
                {item.logo}
              </div>
              <span className="text-sm font-medium text-foreground/70">{item.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
