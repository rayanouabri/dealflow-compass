import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ name: string; url: string }>;
  timestamp: Date;
}

interface AIQAChatProps {
  startupData: {
    name: string;
    sector?: string;
    stage?: string;
    location?: string;
    founded?: string | number;
    teamSize?: string | number;
    problem?: string;
    solution?: string;
    businessModel?: string;
    competitors?: string;
    moat?: string;
    dueDiligenceReport?: any[];
  };
  investmentThesis?: any;
  fundName?: string;
  /** Rapport due diligence complet (sections entreprise, produit, marché, équipe, etc.) pour approfondir les points */
  dueDiligenceData?: any;
}

export function AIQAChat({ startupData, investmentThesis, fundName, dueDiligenceData }: AIQAChatProps) {
  const companyName = startupData?.name || dueDiligenceData?.company?.name || "Entreprise";
  const storageKey = dueDiligenceData ? `ai-qa-due-diligence-${companyName}` : `ai-qa-history-${companyName}`;
  
  // Fonction pour charger l'historique depuis sessionStorage
  const loadHistory = (): Message[] => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Reconvertir les timestamps en Date
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch (_) {}
    return [
      {
        id: "1",
        role: "assistant",
        content: dueDiligenceData
          ? `Bonjour ! Je suis votre assistant IA pour ce rapport de due diligence. Posez-moi des questions pour approfondir un point (financements, équipe, risques, recommandation, métriques, etc.) ou obtenir des précisions. Je m'appuie sur le rapport et des recherches complémentaires.`
          : `Bonjour ! Je suis votre assistant IA spécialisé dans l'analyse de startups. Je peux répondre à vos questions sur ${companyName} en me basant sur les données d'analyse disponibles. Que souhaitez-vous savoir ?`,
        timestamp: new Date(),
      },
    ];
  };
  
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Sauvegarder l'historique à chaque changement
  useEffect(() => {
    if (messages.length > 1) { // Ne pas sauvegarder juste le message initial
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollContainer) {
        scrollContainer.style.overflowX = 'hidden';
        scrollContainer.style.maxWidth = '100%';
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Configuration Supabase manquante");
      }

      const functionUrl = `${supabaseUrl}/functions/v1/ai-qa`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          question: input,
          startupData: { ...startupData, name: companyName },
          investmentThesis,
          fundName,
          dueDiligenceData: dueDiligenceData ?? undefined,
          conversationHistory: messages.slice(-5).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Réponse invalide: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data?.error || `Erreur ${response.status}`);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || data.response || "Désolé, je n'ai pas pu générer de réponse.",
        sources: data.sources || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erreur Q&A:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";

      toast({
        title: "Erreur",
        description: errorMsg,
        variant: "destructive",
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Désolé, une erreur s'est produite: ${errorMsg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  const quickQuestions = dueDiligenceData
    ? ["Résumé des risques", "Recommandation détaillée", "Équipe & fondateurs", "Métriques financières"]
    : ["Stratégie", "Métriques", "Concurrence", "Risques"];

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden w-full max-w-full">
      <div className="p-4 border-b border-primary/20 flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 overflow-hidden">
          <Bot className="w-6 h-6 text-primary flex-shrink-0" />
          <div className="min-w-0 overflow-hidden flex-1">
            <h3 className="font-semibold text-foreground truncate">
              Assistant IA — {dueDiligenceData ? "Due Diligence" : "Questions sur"} {companyName}
            </h3>
            <p className="text-sm text-muted-foreground break-words line-clamp-2">
              {dueDiligenceData ? "Approfondissez des points du rapport, posez des questions sur les sections (financements, équipe, risques, recommandation), ou demandez des infos complémentaires." : "Posez des questions sur l'entreprise, son marché, sa stratégie, ses métriques, etc."}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea
        className="flex-1 p-4 overflow-x-hidden w-full max-w-full"
        ref={scrollAreaRef}
        style={{ overflowX: 'hidden' }}
      >
        <div className="space-y-4 max-w-full overflow-hidden">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              } max-w-full overflow-hidden`}
            >
              <div
                className={`rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-12"
                    : "bg-muted text-foreground mr-4"
                } overflow-hidden flex-1 min-w-0`}
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  maxWidth: message.role === "user" ? "85%" : "90%",
                }}
              >
                <div className="flex items-start gap-2 overflow-hidden">
                  {message.role === "assistant" && (
                    <Bot className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  )}
                  {message.role === "user" && (
                    <User className="w-5 h-5 text-primary-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm whitespace-pre-wrap break-words"
                       style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {message.content}
                    </p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50 overflow-hidden">
                        <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                        <div className="flex flex-wrap gap-1 overflow-hidden">
                          {message.sources.map((source, idx) => (
                            <a
                              key={idx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline max-w-full"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{source.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 flex-shrink-0">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start overflow-hidden">
              <div className="rounded-lg p-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Réflexion en cours...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-primary/20 flex-shrink-0 overflow-hidden">
        <div className="flex flex-wrap gap-2 mb-3 overflow-hidden">
          {quickQuestions.map((q) => (
            <Badge
              key={q}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20 transition-colors flex-shrink-0"
              onClick={() => handleQuickQuestion(q)}
            >
              {q}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 overflow-hidden">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question sur cette startup..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isLoading}
            className="flex-1 min-w-0 bg-background border-primary/20 focus:border-primary"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
