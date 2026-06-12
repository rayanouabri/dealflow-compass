const steps = [
  {
    number: "01",
    title: "Définissez la thèse",
    description:
      "Entrez le nom de votre fonds : l'IA reconstruit votre thèse à partir de votre portfolio réel. Ou décrivez-la directement, secteurs, stade, géographie, ticket.",
  },
  {
    number: "02",
    title: "Sourcing multi-canal",
    description:
      "Plus de cent requêtes parallèles sur douze canaux. Les sociétés déjà en portefeuille sont exclues, les doublons dédupliqués par domaine.",
  },
  {
    number: "03",
    title: "Scoring contre la thèse",
    description:
      "Chaque candidat est noté sur 100 : alignement sectoriel, stade, signaux convergents, récence. Les startups présentes sur plusieurs canaux remontent.",
  },
  {
    number: "04",
    title: "Due diligence sourcée",
    description:
      "Équipe, marché, financements, concurrence, risques : un mémo structuré où chaque affirmation renvoie vers sa source, exportable en Markdown.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28 border-b border-border/70" id="how-it-works">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="lg:col-span-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-4">
              Méthode
            </p>
            <h2 className="font-display text-3xl md:text-[2.25rem] font-medium tracking-tight text-foreground leading-tight">
              Du nom d'un fonds à un mémo d'investissement.
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mt-4 max-w-sm">
              Le pipeline enchaîne quatre étapes sans intervention. Vous gardez la main sur la
              décision, pas sur la collecte.
            </p>
          </div>

          <div className="lg:col-span-8">
            <ol className="divide-y divide-border border-t border-b border-border">
              {steps.map((step) => (
                <li key={step.number} className="py-6 grid sm:grid-cols-12 gap-2 sm:gap-6">
                  <span className="sm:col-span-1 text-[13px] text-muted-foreground tabular-nums pt-0.5">
                    {step.number}
                  </span>
                  <h3 className="sm:col-span-3 text-[15px] font-medium text-foreground leading-snug">
                    {step.title}
                  </h3>
                  <p className="sm:col-span-8 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
