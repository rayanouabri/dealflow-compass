import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { queryClient } from "@/lib/query-client";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";

// Routes secondaires chargées à la demande : la landing n'embarque pas le
// rapport DD (le plus gros composant du site) ni les pages d'analyse.
const Analyser = lazy(() => import("./pages/Analyser"));
const DueDiligence = lazy(() => import("./pages/DueDiligence"));
const DueDiligenceResult = lazy(() => import("./pages/DueDiligenceResult"));
const PipelineProgress = lazy(() => import("./pages/PipelineProgress"));
const Contact = lazy(() => import("./pages/Contact"));
const APropos = lazy(() => import("./pages/APropos"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const ConditionsUtilisation = lazy(() => import("./pages/ConditionsUtilisation"));
const Confidentialite = lazy(() => import("./pages/Confidentialite"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background dark">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ai-vc-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/analyser" element={<ProtectedRoute><Analyser /></ProtectedRoute>} />
                <Route path="/due-diligence" element={<ProtectedRoute><DueDiligence /></ProtectedRoute>} />
                <Route path="/due-diligence/result" element={<ProtectedRoute><DueDiligenceResult /></ProtectedRoute>} />
                <Route path="/pipeline" element={<ProtectedRoute><PipelineProgress /></ProtectedRoute>} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/a-propos" element={<APropos />} />
                <Route path="/mentions-legales" element={<MentionsLegales />} />
                <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
                <Route path="/confidentialite" element={<Confidentialite />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
