import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "On a bouclé notre Seed en 6 semaines grâce aux pitch decks générés. Le matching était ultra précis.",
    author: "Marie Dubois",
    role: "CEO & Co-founder",
    company: "DataFlow",
    funding: "€2.4M Seed",
    avatar: "MD",
    rating: 5
  },
  {
    quote: "J'ai économisé 3 mois de recherche. L'IA a identifié des fonds que je n'aurais jamais trouvés seul.",
    author: "Thomas Martin",
    role: "Founder",
    company: "GreenTech Solutions",
    funding: "€1.8M Pre-seed",
    avatar: "TM",
    rating: 5
  },
  {
    quote: "Le dashboard de suivi a transformé notre process. On sait exactement où on en est avec chaque VC.",
    author: "Sophie Chen",
    role: "COO",
    company: "FinanceAI",
    funding: "€5.2M Series A",
    avatar: "SC",
    rating: 5
  },
  {
    quote: "En tant qu'investisseur, je recommande VC Match à toutes les startups de notre portfolio pour leur prochaine levée.",
    author: "Jean-Pierre Rousseau",
    role: "Partner",
    company: "Horizon Ventures",
    funding: "",
    avatar: "JR",
    rating: 5
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
              Témoignages
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ils ont levé grâce à
              <span className="text-gradient-success"> VC Match</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Plus de €50M levés par nos utilisateurs en 2024.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              className="relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              {/* Quote icon */}
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              
              {/* Quote */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {testimonial.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
                {testimonial.funding && (
                  <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                    {testimonial.funding}
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
