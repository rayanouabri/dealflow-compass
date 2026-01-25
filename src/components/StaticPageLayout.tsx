import { Link } from "react-router-dom";
import { BarChart3, ArrowLeft } from "lucide-react";
import { Footer } from "@/components/landing/Footer";

interface StaticPageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function StaticPageLayout({ children, title }: StaticPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/50 sticky top-0 z-50">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-foreground">
                <span className="text-primary">ai</span>
                <span className="text-amber-500">vc</span>
                <span className="text-primary">.</span>
              </span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
