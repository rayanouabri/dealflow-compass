import { useEffect, useRef, useState } from "react";

const stats = [
  {
    value: "12",
    label: "Canaux de signaux",
    description: "LinkedIn, brevets, GitHub, arXiv, Pappers, Show HN…",
  },
  {
    value: "100+",
    label: "Requêtes par analyse",
    description: "Sourcing multi-canal en parallèle, dédupliqué par domaine.",
  },
  {
    value: "5 min",
    label: "Du sourcing au rapport",
    description: "Ce qu'un analyste produit en deux jours de travail.",
  },
  {
    value: "8",
    label: "Catégories de signaux faibles",
    description: "Embauches, spin-offs, IP, traction open source…",
  },
];

// Compteur animé déclenché à l'entrée dans la vue (count-up + easing).
function Counter({ value }: { value: string }) {
  const m = value.match(/^(\d+)(.*)$/);
  const isNum = !!m;
  const target = m ? parseInt(m[1], 10) : 0;
  const suffix = m ? m[2] : "";
  const ref = useRef<HTMLParagraphElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!isNum) return;
    const el = ref.current;
    if (!el) return;
    const reduce =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setN(target);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const dur = 1100;
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(target * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // deps = primitives stables (isNum/target) — surtout PAS l'objet `m` du match,
    // qui change de référence à chaque render et relançait/gelait l'animation.
  }, [isNum, target]);

  return (
    <p
      ref={ref}
      className="font-display text-3xl md:text-4xl font-medium text-foreground tabular-nums leading-none"
    >
      {isNum ? `${n}${suffix}` : value}
    </p>
  );
}

export function StatsSection() {
  return (
    <section className="py-16 md:py-20 border-b border-border/70">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border-t border-border pt-5 transition-colors duration-300 hover:border-foreground/40"
            >
              <Counter value={stat.value} />
              <p className="text-sm font-medium text-foreground mt-3">{stat.label}</p>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
