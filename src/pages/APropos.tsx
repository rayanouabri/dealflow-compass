import { StaticPageLayout } from "@/components/StaticPageLayout";
import { Link } from "react-router-dom";

export default function APropos() {
  return (
    <StaticPageLayout title="À propos">
      <div className="space-y-6">
        <p>
          <strong className="text-foreground">AI-VC</strong> est un outil de sourcing et d&apos;analyse de startups 
          conçu pour les fonds d&apos;investissement. Notre objectif : identifier des startups qui correspondent 
          à votre thèse d&apos;investissement et produire des rapports de due diligence de niveau professionnel.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Comment ça marche</h2>
        <p>
          Analysez un fond VC existant (ex. Accel, Sequoia) ou définissez votre propre thèse. 
          Notre moteur combine recherche web (Brave), IA (Gemini) et plusieurs couches de sourcing 
          pour sourcer des startups réelles et générer des rapports détaillés.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Qui sommes-nous</h2>
        <p>
          Équipe portée par l&apos;innovation et l&apos;EDHEC. Pour nous joindre :{" "}
          <Link to="/contact" className="text-primary hover:underline">page Contact</Link>.
        </p>
      </div>
    </StaticPageLayout>
  );
}
