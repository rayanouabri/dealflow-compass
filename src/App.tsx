import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import Index from "./pages/Index";
import Analyser from "./pages/Analyser";
import Analyse from "./pages/Analyse";
import DueDiligence from "./pages/DueDiligence";
import DueDiligenceResult from "./pages/DueDiligenceResult";
import Contact from "./pages/Contact";
import APropos from "./pages/APropos";
import MentionsLegales from "./pages/MentionsLegales";
import ConditionsUtilisation from "./pages/ConditionsUtilisation";
import Confidentialite from "./pages/Confidentialite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ai-vc-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/analyser" element={<Analyser />} />
            <Route path="/analyse" element={<Analyse />} />
            <Route path="/due-diligence" element={<DueDiligence />} />
            <Route path="/due-diligence/result" element={<DueDiligenceResult />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
