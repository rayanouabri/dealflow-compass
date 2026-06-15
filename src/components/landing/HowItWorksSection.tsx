const steps = [
  {
    number: "01",
    title: "Définissez vos critères",
    description:
      "Cochez vos secteurs et stades, choisissez la géographie, et précisez votre thèse en texte libre (exemples de startups, portfolio). L'IA structure le tout en stratégie de sourcing.",
  },
  {
    number: "02",
    title: "Sourcing multi-canal",
    description:
      "Plus de cent requêtes parallèles sur douze canaux. Les sociétés déjà en portefeuille sont exclues, les doublons dédupliqués par domaine.",
  },
  {
    number: "03",
    title: "Scoring qualité VC",
    description:
      "Chaque candidat est noté sur la qualité d'investissement : adéquation à la thèse, équipe complémentaire, moat réel, marché porteur. La notoriété n'est jamais un critère — une pépite discrète bien alignée passe devant une référence déjà trop avancée.",
  },
  {
    number: "04",
    title: "Due diligence sourcée",
    description:
      "Équipe, marché, moat, financements, concurrence, risques + un avis de comité d'investissement (thèse falsifiable, bull/bear, modèle de retour). Chaque affirmation est chiffrée et renvoie vers sa source. Export PDF ou Markdown.",
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
              De vos critères à un mémo d'investissement.
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
