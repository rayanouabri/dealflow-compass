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

export function StatsSection() {
  return (
    <section className="py-16 md:py-20 border-b border-border/70">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
          {stats.map((stat) => (
            <div key={stat.label} className="border-t border-border pt-5">
              <p className="font-display text-3xl md:text-4xl font-medium text-foreground tabular-nums leading-none">
                {stat.value}
              </p>
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
