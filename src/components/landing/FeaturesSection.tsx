const features = [
  {
    title: "Détection multi-signaux",
    description:
      "Douze canaux croisés : embauches LinkedIn, brevets INPI / EPO / USPTO, GitHub, arXiv / HAL, Product Hunt, Show HN, Pappers. Une startup présente sur trois canaux ou plus est automatiquement remontée.",
  },
  {
    title: "Détection pré-Crunchbase",
    description:
      "Mouvements chercheur vers fondateur, hiring bursts, dépôts de brevets, orgs GitHub récentes : les signaux les plus en amont, avant qu'une société ait une page Crunchbase ou PitchBook.",
  },
  {
    title: "Filtrage thèse et portfolio",
    description:
      "La thèse est extraite de votre portfolio réel, puis les sociétés déjà investies sont exclues du sourcing. Aucun doublon avec votre deck.",
  },
  {
    title: "Scoring avec corroboration",
    description:
      "Chaque candidat est noté : poids du signal, nombre de mentions, récence, bonus de convergence entre canaux. Le classement est explicable, critère par critère.",
  },
  {
    title: "Due diligence traçable",
    description:
      "Rapport structuré en huit sections, généré en deux minutes environ. Chaque affirmation est reliée à sa source ; les limites des données sont indiquées explicitement.",
  },
  {
    title: "Couverture France et international",
    description:
      "Requêtes natives en français (Pappers, HAL, INPI, Welcome to the Jungle) et requêtes globales en anglais lorsque la géographie de la thèse l'exige.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 border-b border-border/70">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-4">
            Fonctionnalités
          </p>
          <h2 className="font-display text-3xl md:text-[2.25rem] font-medium tracking-tight text-foreground leading-tight">
            Un moteur de signaux faibles, pas un wrapper de chat.
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mt-4">
            Conçu pour le sourcing pré-seed et seed, là où les bases de données classiques
            n'ont pas encore de ligne.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {features.map((feature) => (
            <div key={feature.title} className="border-t border-border pt-5">
              <h3 className="text-[15px] font-medium text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
