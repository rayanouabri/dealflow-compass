import { StaticPageLayout } from "@/components/StaticPageLayout";
import { Link } from "react-router-dom";

export default function MentionsLegales() {
  return (
    <StaticPageLayout title="Mentions légales">
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Éditeur</h2>
        <p>
          Le site <strong className="text-foreground">ai-vc-sourcing.vercel.app</strong> est édité par Rayan Ouabri. 
          Contact : <a href="mailto:rayan.ouabri@edhec.com" className="text-primary hover:underline">rayan.ouabri@edhec.com</a>.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Hébergement</h2>
        <p>
          L&apos;application est hébergée par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble du contenu (textes, visuels, logiciels) est protégé par le droit d&apos;auteur. 
          Toute reproduction non autorisée est interdite.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Données personnelles</h2>
        <p>
          Pour les informations relatives au traitement des données, consultez notre{" "}
          <Link to="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link>.
        </p>
      </div>
    </StaticPageLayout>
  );
}
