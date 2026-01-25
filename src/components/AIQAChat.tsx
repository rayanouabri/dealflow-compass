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
    sector: string;
    stage: string;
    location: string;
    founded: string | number;
    teamSize: string | number;
    problem?: string;
    solution?: string;
    businessModel?: string;
    competitors?: string;
    moat?: string;
    dueDiligenceReport?: any[];
  };
  investmentThesis?: any;
  fundName?: string;
}

export function AIQAChat({ startupData, investmentThesis, fundName }: AIQAChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Bonjour ! Je suis votre assistant IA spécialisé dans l'analyse de startups. Je peux répondre à vos questions sur ${startupData.name} en me basant sur les données d'analyse disponibles. Que souhaitez-vous savoir ?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
          startupData,
          investmentThesis,
          fundName,
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Désolé, une erreur s'est produite: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: "Erreur",
        description: "Impossible d'obtenir une réponse. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-white border border-border shadow-sm max-w-full overflow-hidden" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <CardHeader className="border-b bg-muted/30 overflow-hidden" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardTitle className="flex items-center gap-2 text-foreground min-w-0">
          <Bot className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="truncate">Assistant IA - Questions sur {startupData.name}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          Posez des questions sur l'entreprise, son marché, sa stratégie, ses métriques, etc.
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 bg-muted/10 overflow-hidden max-w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <ScrollArea className="flex-1 p-4 overflow-x-hidden max-w-full" ref={scrollAreaRef} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="space-y-4 min-w-0 w-full" style={{ overflowX: 'hidden', maxWidth: '100%', width: '100%' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 min-w-0 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] min-w-0 rounded-xl p-4 shadow-sm overflow-hidden ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground border border-primary/20"
                      : "bg-white text-foreground border border-border"
                  }`}
                  style={{ maxWidth: '80%', minWidth: 0, overflow: 'hidden', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  <div className="flex items-start gap-2 mb-1 min-w-0" style={{ minWidth: 0, maxWidth: '100%' }}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-90" />
                    ) : (
                      <Bot className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    )}
                    <p 
                      className={`text-sm whitespace-pre-wrap break-words min-w-0 ${message.role === "user" ? "text-primary-foreground" : "text-foreground"}`} 
                      style={{ 
                        wordBreak: 'break-word', 
                        overflowWrap: 'anywhere', 
                        minWidth: 0, 
                        maxWidth: '100%',
                        overflow: 'hidden'
                      }}
                    >
                      {message.content}
                    </p>
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className={`mt-3 pt-3 ${message.role === "user" ? "border-t border-primary-foreground/20" : "border-t border-border"}`}>
                      <p className={`text-xs font-medium mb-2 ${message.role === "user" ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                        Sources :
                      </p>
                      <div className="flex flex-wrap gap-2 min-w-0">
                        {message.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs hover:underline break-all max-w-full ${
                              message.role === "user"
                                ? "text-primary-foreground/90 hover:text-primary-foreground"
                                : "text-primary hover:text-primary/80"
                            }`}
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="break-all" style={{ overflowWrap: 'anywhere' }}>{source.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className={`text-xs mt-2 ${message.role === "user" ? "opacity-80" : "text-muted-foreground"}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-foreground">Réflexion en cours...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t bg-white p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Posez une question sur cette startup..."
              disabled={isLoading}
              className="flex-1 bg-background"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-primary hover:bg-primary/90">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="cursor-pointer text-xs hover:bg-primary/10 hover:border-primary/30 transition-colors"
              onClick={() => setInput("Quelle est la stratégie de croissance de cette entreprise ?")}
            >
              Stratégie
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer text-xs hover:bg-primary/10 hover:border-primary/30 transition-colors"
              onClick={() => setInput("Quelles sont les métriques financières clés ?")}
            >
              Métriques
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer text-xs hover:bg-primary/10 hover:border-primary/30 transition-colors"
              onClick={() => setInput("Qui sont les principaux concurrents ?")}
            >
              Concurrence
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer text-xs hover:bg-primary/10 hover:border-primary/30 transition-colors"
              onClick={() => setInput("Quels sont les risques principaux ?")}
            >
              Risques
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

