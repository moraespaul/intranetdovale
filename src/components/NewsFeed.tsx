import { Calendar, User, Loader2, X, Paperclip, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const NewsFeed = () => {
  const { data: newsData = [], isLoading } = useQuery({
    queryKey: ["noticias"],
    queryFn: async () => {
      const response = await fetch(`/api/Noticias`);
      if (!response.ok) return [];
      return await response.json();
    }
  });

  const [selectedPost, setSelectedPost] = useState<any>(null);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">Últimas Notícias</h2>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-orange" />
        </div>
      ) : newsData.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma notícia publicada ainda.</p>
      ) : (
        newsData.map((news: any) => (
        <article
            key={news.Id || news.id}
          className="bg-card rounded-xl card-shadow overflow-hidden hover:card-shadow-hover transition-shadow animate-fade-in"
        >
            {news.Imagem && (
              <img src={news.Imagem} alt={news.Titulo} className="w-full h-48 object-contain bg-secondary/30" loading="lazy" />
            )}
          <div className="p-5">
            <h3 className="font-bold text-foreground text-base mb-2 leading-tight">
                {news.Titulo}
            </h3>
            <div 
              className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-3 prose-styles"
              dangerouslySetInnerHTML={{ __html: news.Resumo }} 
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                    {news.Autor}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                    {news.DataPublicacao}
                </span>
              </div>
              <Button variant="accent" size="sm" onClick={() => setSelectedPost(news)}>
                Leia Mais
              </Button>
            </div>
          </div>
        </article>
        ))
      )}

      {/* Modal de Notícia Completa */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in" onClick={() => setSelectedPost(null)}>
          <div className="bg-background max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 rounded-full p-1.5 transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>
            {selectedPost.Imagem && (
              <img src={selectedPost.Imagem} alt={selectedPost.Titulo} className="w-full h-64 sm:h-80 object-cover" />
            )}
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 leading-tight">{selectedPost.Titulo}</h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-4 border-b border-border">
                <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {selectedPost.Autor}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {selectedPost.DataPublicacao}</span>
              </div>
              <div 
                className="prose prose-sm max-w-none text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedPost.Resumo }} 
              />
              
              {/* Arquivos Anexos */}
              {selectedPost.Anexos && selectedPost.Anexos.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-orange" /> Arquivos Anexados
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedPost.Anexos.map((anexo: any, idx: number) => (
                      <a key={idx} href={anexo.url || anexo.conteudo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-secondary text-sm px-4 py-2.5 rounded-lg hover:bg-secondary/80 hover:shadow-md transition-all border border-border text-foreground font-medium">
                        <Download className="h-4 w-4 text-orange" />
                        {anexo.nome}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
