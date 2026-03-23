import newsBanner1 from "@/assets/news-banner-1.jpg";
import newsBanner2 from "@/assets/news-banner-2.jpg";
import newsBanner3 from "@/assets/news-banner-3.jpg";

export interface NewsItem {
  id: number;
  titulo: string;
  resumo: string;
  imagem: string;
  autor: string;
  data: string;
}

export const newsData: NewsItem[] = [
  {
    id: 1,
    titulo: "Campanha de Vendas — Março 2026",
    resumo: "Confira as metas e premiações da nova campanha de vendas para o mês de março. Participe e concorra a prêmios exclusivos!",
    imagem: newsBanner2,
    autor: "Comercial",
    data: "23/03/2026",
  },
  {
    id: 2,
    titulo: "Aviso de Manutenção Programada",
    resumo: "O sistema de produção passará por manutenção preventiva no próximo sábado. Planeje suas atividades com antecedência.",
    imagem: newsBanner3,
    autor: "TI",
    data: "22/03/2026",
  },
  {
    id: 3,
    titulo: "Novo Catálogo de Chaves Codificadas",
    resumo: "Atualizamos nosso catálogo com os novos modelos de chaves codificadas para veículos 2026. Consulte as especificações técnicas.",
    imagem: newsBanner1,
    autor: "RH",
    data: "20/03/2026",
  },
];
