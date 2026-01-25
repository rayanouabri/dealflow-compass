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
            className="inline-flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <Mail className="w-5 h-5 text-primary shrink-0" />
            <span className="font-medium text-foreground">{CONTACT_EMAIL}</span>
          </a>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
            <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">Rayan Ouabri</p>
              <p className="text-sm">{CONTACT_EMAIL}</p>
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
