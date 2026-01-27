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
    <div className="flex flex-col h-full bg-gray-950 max-w-full overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 overflow-hidden" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <h2 className="text-white font-semibold flex items-center gap-2 min-w-0">
          <span className="text-xl">🤖</span>
          <span className="truncate">Assistant IA - Questions sur {startupData.name}</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          Posez des questions sur l'entreprise, son marché, sa stratégie, ses métriques, etc.
        </p>
      </div>

      {/* Zone de messages */}
      <ScrollArea 
        className="flex-1 overflow-y-auto p-4 bg-gray-900 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900" 
        ref={scrollAreaRef}
        style={{ maxWidth: '100%', overflowX: 'hidden' }}
      >
        <div className="space-y-3 min-w-0 w-full" style={{ overflowX: 'hidden', maxWidth: '100%', width: '100%' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${
                message.role === "user"
                  ? "bg-yellow-400/10 border-l-4 border-yellow-400"
                  : "bg-gray-800 border-l-4 border-gray-600"
              } p-4 rounded-lg mb-3 overflow-hidden`}
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}
            >
              <div className="flex items-start gap-2 mb-2 min-w-0" style={{ minWidth: 0, maxWidth: '100%' }}>
                {message.role === "user" ? (
                  <User className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                ) : (
                  <Bot className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                )}
                <p 
                  className={`text-sm whitespace-pre-wrap break-words min-w-0 ${
                    message.role === "user" ? "text-white" : "text-gray-100"
                  }`} 
                  style={{ 
                    wordBreak: 'break-word', 
                    overflowWrap: 'anywhere', 
                    minWidth: 0, 
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}
                >
                  {message.content
                    .replace(/\*\*(.*?)\*\*/g, '$1') // Enlever **bold**
                    .replace(/\*(.*?)\*/g, '$1') // Enlever *italic*
                    .replace(/__(.*?)__/g, '$1') // Enlever __bold__
                    .replace(/_(.*?)_/g, '$1') // Enlever _italic_
                    .replace(/~~(.*?)~~/g, '$1') // Enlever ~~strikethrough~~
                    .replace(/`(.*?)`/g, '$1') // Enlever `code`
                    .replace(/```[\s\S]*?```/g, '') // Enlever blocs de code
                  }
                </p>
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs font-medium mb-2 text-gray-400">
                    Sources :
                  </p>
                  <div className="flex flex-wrap gap-2 min-w-0">
                    {message.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs hover:underline break-all max-w-full text-yellow-400 hover:text-yellow-300"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="break-all" style={{ overflowWrap: 'anywhere' }}>{source.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <span className="text-gray-500 text-xs mt-2 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
          {isLoading && (
            <div className="bg-gray-800 border-l-4 border-gray-600 p-4 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                <span className="text-sm text-gray-100">Réflexion en cours...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Zone d'input */}
      <div className="border-t border-gray-800 p-4 bg-gray-950">
        <div className="flex gap-2 mb-3">
          <Badge
            variant="outline"
            className="cursor-pointer text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            onClick={() => setInput("Quelle est la stratégie de croissance de cette entreprise ?")}
          >
            Stratégie
          </Badge>
          <Badge
            variant="outline"
            className="cursor-pointer text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            onClick={() => setInput("Quelles sont les métriques financières clés ?")}
          >
            Métriques
          </Badge>
          <Badge
            variant="outline"
            className="cursor-pointer text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            onClick={() => setInput("Qui sont les principaux concurrents ?")}
          >
            Concurrence
          </Badge>
          <Badge
            variant="outline"
            className="cursor-pointer text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            onClick={() => setInput("Quels sont les risques principaux ?")}
          >
            Risques
          </Badge>
        </div>
        
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
            className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 rounded-lg px-4 py-3 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none"
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()} 
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 p-3 rounded-lg transition-colors"
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

