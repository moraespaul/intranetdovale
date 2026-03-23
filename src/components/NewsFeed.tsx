import { Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { newsData } from "@/data/news";

const NewsFeed = () => {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">Últimas Notícias</h2>
      {newsData.map((news) => (
        <article
          key={news.id}
          className="bg-card rounded-xl card-shadow overflow-hidden hover:card-shadow-hover transition-shadow animate-fade-in"
        >
          <img
            src={news.imagem}
            alt={news.titulo}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
          <div className="p-5">
            <h3 className="font-bold text-foreground text-base mb-2 leading-tight">
              {news.titulo}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              {news.resumo}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {news.autor}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {news.data}
                </span>
              </div>
              <Button variant="accent" size="sm">
                Leia Mais
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default NewsFeed;
