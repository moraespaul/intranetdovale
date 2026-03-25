import { Calendar, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const NewsFeed = () => {
  const { data: newsData = [], isLoading } = useQuery({
    queryKey: ["noticias"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/Noticias");
      if (!response.ok) return [];
      return await response.json();
    }
  });

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
              <img src={news.Imagem} alt={news.Titulo} className="w-full h-48 object-cover" loading="lazy" />
            )}
          <div className="p-5">
            <h3 className="font-bold text-foreground text-base mb-2 leading-tight">
                {news.Titulo}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {news.Resumo}
            </p>
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
              <Button variant="accent" size="sm">
                Leia Mais
              </Button>
            </div>
          </div>
        </article>
        ))
      )}
    </div>
  );
};

export default NewsFeed;
