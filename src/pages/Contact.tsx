import { StaticPageLayout } from "@/components/StaticPageLayout";
import { Mail, MapPin } from "lucide-react";

const CONTACT_EMAIL = "rayan.ouabri@edhec.com";

export default function Contact() {
  return (
    <StaticPageLayout title="Contact">
      <div className="space-y-6">
        <p>
          Pour toute question, partenariat ou demande d&apos;information sur AI-VC, vous pouvez nous contacter :
        </p>
        <div className="flex flex-col gap-4 not-prose">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-3 p-6 rounded-xl border border-primary/30 bg-card/50 hover:bg-primary/10 hover:border-primary/50 transition-all backdrop-blur-sm glow-ai-vc group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Mail className="w-6 h-6 text-primary shrink-0" />
            </div>
            <span className="font-medium text-foreground text-lg">{CONTACT_EMAIL}</span>
          </a>
          <div className="flex items-start gap-3 p-6 rounded-xl border border-primary/20 bg-card/50 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary shrink-0" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1 text-lg">Rayan Ouabri</p>
              <p className="text-sm text-muted-foreground">{CONTACT_EMAIL}</p>
            </div>
          </div>
        </div>
        <p className="text-sm">
          Nous nous efforçons de répondre sous 48 heures ouvrées.
        </p>
      </div>
    </StaticPageLayout>
  );
}
