import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  Bell, 
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles
} from "lucide-react";

interface DashboardPreviewProps {
  onStartTrial: () => void;
}

export function DashboardPreview({ onStartTrial }: DashboardPreviewProps) {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <div className="absolute inset-0 terminal-grid opacity-[0.05]" />
      
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/20 backdrop-blur-sm">
              Aperçu du Dashboard
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Tout votre sourcing
              <span className="block text-gradient-ai-vc">dans un seul endroit</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Suivez vos analyses de startups, gérez vos rapports de due diligence et mesurez votre pipeline de deals.
            </p>
          </motion.div>
        </div>

        {/* Dashboard Mockup */}
        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-sm shadow-2xl shadow-primary/20 overflow-hidden glow-ai-vc">
            {/* Browser header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-data-amber/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="w-full max-w-md mx-auto h-6 rounded-md bg-muted/50 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">app.vcmatch.io/dashboard</span>
                </div>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-6 md:p-8">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Stats cards */}
                <div className="space-y-4">
                  <DashboardCard 
                    icon={Users}
                    label="Matchings actifs"
                    value="24"
                    change="+8 cette semaine"
                    positive
                  />
                  <DashboardCard 
                    icon={FileText}
                    label="Pitch decks"
                    value="12"
                    change="3 en attente"
                  />
                  <DashboardCard 
                    icon={Bell}
                    label="Réponses VCs"
                    value="6"
                    change="2 meetings confirmés"
                    positive
                  />
                </div>

                {/* Activity feed */}
                <div className="md:col-span-2 rounded-xl bg-muted/30 border border-border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-sm">Activité récente</h4>
                    <Badge variant="secondary" className="text-xs">Live</Badge>
                  </div>
                  <div className="space-y-3">
                    <ActivityItem 
                      icon={CheckCircle2}
                      iconColor="text-success"
                      title="Match confirmé avec Sequoia Capital"
                      time="Il y a 2h"
                      highlight
                    />
                    <ActivityItem 
                      icon={Sparkles}
                      iconColor="text-primary"
                      title="Pitch deck généré pour Index Ventures"
                      time="Il y a 5h"
                    />
                    <ActivityItem 
                      icon={TrendingUp}
                      iconColor="text-accent"
                      title="Score de matching amélioré: 78% → 92%"
                      time="Hier"
                    />
                    <ActivityItem 
                      icon={Clock}
                      iconColor="text-data-amber"
                      title="Meeting planifié: Accel Partners"
                      time="Dans 3 jours"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom CTA bar */}
              <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Prêt à accélérer votre levée ?</p>
                    <p className="text-xs text-muted-foreground">Accédez à toutes ces fonctionnalités</p>
                  </div>
                </div>
                <Button onClick={onStartTrial} size="sm" className="gap-2">
                  Commencer gratuitement
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function DashboardCard({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  positive 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className={`text-xs mt-1 ${positive ? 'text-success' : 'text-muted-foreground'}`}>
        {change}
      </p>
    </div>
  );
}

function ActivityItem({ 
  icon: Icon, 
  iconColor, 
  title, 
  time,
  highlight 
}: { 
  icon: any; 
  iconColor: string; 
  title: string; 
  time: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${highlight ? 'bg-success/5 border border-success/20' : ''}`}>
      <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{title}</p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">{time}</span>
    </div>
  );
}
