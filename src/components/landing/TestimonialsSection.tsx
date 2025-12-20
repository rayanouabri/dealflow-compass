import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "On a identifié 3 startups exceptionnelles en 2 semaines. La due diligence automatisée nous fait gagner un temps précieux.",
    author: "Marie Dubois",
    role: "Investment Partner",
    company: "Horizon Ventures",
    funding: "€50M AUM",
    avatar: "MD",
    rating: 5
  },
  {
    quote: "Le sourcing IA a transformé notre process. On analyse 10x plus de startups avec la même équipe.",
    author: "Thomas Martin",
    role: "Principal",
    company: "GreenTech Capital",
    funding: "€25M Fund",
    avatar: "TM",
    rating: 5
  },
  {
    quote: "Les rapports de due diligence sont d'une qualité professionnelle. On prend des décisions plus rapidement.",
    author: "Sophie Chen",
    role: "Managing Partner",
    company: "FinanceAI Ventures",
    funding: "€100M AUM",
    avatar: "SC",
    rating: 5
  },
  {
    quote: "DealFlow Compass a automatisé 80% de notre sourcing. C'est un game-changer pour notre fonds.",
    author: "Jean-Pierre Rousseau",
    role: "Founding Partner",
    company: "Index Capital",
    funding: "€200M Fund",
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
              Ils investissent mieux avec
              <span className="text-gradient-success"> DealFlow Compass</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Plus de 200 fonds VC utilisent notre plateforme pour leur sourcing et due diligence.
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
