import { useState } from "react";
import { Search, Key, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Como os arquivos estão no XAMPP, acessamos via HTTP.
// A pasta "htdocs" é a raiz do servidor, logo ela não entra na URL.
// O navegador exige que sejam usadas barras normais (/).
const MEDIA_BASE_URL = "http://192.168.10.8/intranet/wp-content/uploads/";

const FaqSection = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Busca e processa o arquivo CSV dinamicamente
  const { data: faqData = [], isLoading } = useQuery({
    queryKey: ["faq-csv"],
    queryFn: async () => {
      // O arquivo faq.csv deve ser colocado na raiz da pasta "public" do seu projeto
      const response = await fetch("/faq.csv");
      if (!response.ok) throw new Error("Erro ao carregar o arquivo CSV");
      
      // Lê como ArrayBuffer e decodifica usando ISO-8859-1 (padrão do Excel/Windows)
      // Isso resolve o problema de caracteres especiais e acentos (ç, ã, é, etc.)
      const arrayBuffer = await response.arrayBuffer();
      const text = new TextDecoder("iso-8859-1").decode(arrayBuffer);
      
      // Separa as linhas do arquivo (cobre \r\n do Windows e \n padrão)
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      
      // Ignora a linha 0 (cabeçalhos) e converte o restante em objetos
      return lines.slice(1).map((line) => {
        // Expressão Regular (Regex) que divide a linha pelo separador ';',
        // mas IGNORA os ';' que estiverem contidos dentro de aspas duplas ("").
        const columns = line.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => 
          col.replace(/^"(.*)"$/, '$1').trim() // Remove as aspas em volta do texto, se existirem
        );
        
        const [codigo, descricao, funcionalidade, video, fotos] = columns;
        return {
          codigo: codigo?.trim() || "",
          descricao: descricao?.trim() || "",
          funcionalidade: funcionalidade?.trim() || "",
          video: video?.trim() || "",
          fotos: fotos?.trim() || "",
          categoria: "Produtos", // Como não veio categoria no CSV, fixamos uma padrão.
        };
      });
    },
  });

  const categories = [...new Set(faqData.map((f) => f.categoria))];

  const filtered = faqData.filter((item) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      item.codigo.toLowerCase().includes(searchLower) ||
      item.descricao.toLowerCase().includes(searchLower) ||
      item.funcionalidade.toLowerCase().includes(searchLower);
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange" />
            <p className="text-sm text-muted-foreground">Carregando perguntas...</p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filtered.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card rounded-xl card-shadow border-none px-1 data-[state=open]:card-shadow-hover transition-shadow"
            >
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline px-4 py-4">
                <span className="text-left">
                  <span className="font-bold text-orange mr-2">
                    {item.codigo}
                  </span>
                  <span className="text-muted-foreground text-xs truncate max-w-[200px] sm:max-w-md hidden sm:inline-block align-middle">
                    {item.descricao}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed px-4 pb-4 space-y-4">
                {item.descricao && (
                  <div>
                    <strong className="text-foreground block mb-1">Descrição:</strong>
                    <p>{item.descricao}</p>
                  </div>
                )}
                
                {item.funcionalidade && (
                  <div>
                    <strong className="text-foreground block mb-1">Funcionalidade:</strong>
                    <p>{item.funcionalidade}</p>
                  </div>
                )}

                {/* O .replace garante a barra normal (/) e evita barras duplas no começo da string */}
                {item.fotos && (
                  <div>
                    <strong className="text-foreground block mb-2">Imagem:</strong>
                    <img 
                      src={`${MEDIA_BASE_URL}${item.fotos.replace(/\\/g, "/").replace(/^\/+/, "")}`} 
                      alt={item.codigo} 
                      className="max-w-xs md:max-w-md h-auto rounded-lg border border-border object-cover"
                    />
                  </div>
                )}

                {item.video && (
                  <div>
                    <strong className="text-foreground block mb-2">Vídeo:</strong>
                    <video 
                      src={`${MEDIA_BASE_URL}${item.video.replace(/\\/g, "/").replace(/^\/+/, "")}`} 
                      controls 
                      className="max-w-xs md:max-w-md w-full rounded-lg border border-border bg-black"
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
          </Accordion>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhum resultado encontrado.
          </p>
        )}
    </div>
  );
};

export default FaqSection;
