import { useState } from "react";
import { Search, Key } from "lucide-react";
import { faqData } from "@/data/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FaqSection = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [...new Set(faqData.map((f) => f.categoria))];

  const filtered = faqData.filter((item) => {
    const matchesSearch =
      item.pergunta.toLowerCase().includes(search.toLowerCase()) ||
      item.resposta.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || item.categoria === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Key className="h-6 w-6 text-orange" />
          FAQ Técnico — Produtos
        </h2>
        <p className="text-muted-foreground text-sm">
          Especificações técnicas de chaves, fechaduras e produtos
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar no FAQ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-input text-foreground text-sm focus:border-orange focus:outline-none transition-colors card-shadow"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !activeCategory
              ? "bg-orange text-accent-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat
                ? "bg-orange text-accent-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {filtered.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="bg-card rounded-xl card-shadow border-none px-1 data-[state=open]:card-shadow-hover transition-shadow"
          >
            <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline px-4 py-4">
              <span className="text-left">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-navy text-primary-foreground mr-2">
                  {item.categoria}
                </span>
                {item.pergunta}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed px-4 pb-4">
              {item.resposta}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">
          Nenhum resultado encontrado.
        </p>
      )}
    </div>
  );
};

export default FaqSection;
