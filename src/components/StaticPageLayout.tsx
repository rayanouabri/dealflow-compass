import { Link } from "react-router-dom";
import { BarChart3, ArrowLeft } from "lucide-react";
import { Footer } from "@/components/landing/Footer";

interface StaticPageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function StaticPageLayout({ children, title }: StaticPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background dark">
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#252540] to-[#1a1a2e] -z-10" />
      <div className="fixed inset-0 terminal-grid opacity-[0.12] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(48,100%,60%,0.25),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(220,50%,50%,0.18),transparent_50%)] -z-10" />
      
      <header className="border-b border-primary/30 bg-background/90 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-primary/10">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity group">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center glow-ai-vc border border-primary/30 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-foreground">
                <span className="text-foreground">ai</span>
                <span className="text-primary">vc</span>
                <span className="text-foreground">.</span>
              </span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10 relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
          {title}
        </h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
