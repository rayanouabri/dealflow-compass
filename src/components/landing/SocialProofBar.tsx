const sources = [
  { name: "LinkedIn", hint: "embauches, fondateurs" },
  { name: "INPI / EPO", hint: "brevets" },
  { name: "GitHub", hint: "open source" },
  { name: "arXiv / HAL", hint: "spin-offs recherche" },
  { name: "Pappers", hint: "registres FR" },
  { name: "Product Hunt / HN", hint: "lancements" },
];

export function SocialProofBar() {
  return (
    <section className="border-b border-border/70 py-10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <p className="text-xs text-muted-foreground uppercase tracking-[0.18em] mb-6">
          Douze canaux de signaux agrégés en continu
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-5">
          {sources.map((src) => (
            <div key={src.name}>
              <p className="text-sm font-medium text-foreground">{src.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{src.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
