import { Cake, Loader2, CalendarHeart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Aniversariante {
  id: string;
  nome: string;
  depto: string;
  data: string;
  dia: number;
}

const BirthdayWidget = () => {
  const { data: birthdays = [], isLoading } = useQuery<Aniversariante[]>({
    queryKey: ["aniversariantes"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/Aniversariantes");
      if (!response.ok) return [];
      return await response.json();
    },
  });

  const hoje = new Date().getDate();
  const aniversariantesHoje = birthdays.filter(b => b.dia === hoje);
  const aniversariantesMes = birthdays.filter(b => b.dia !== hoje);

  return (
    <div className="bg-card rounded-xl card-shadow overflow-hidden">
      <div className="bg-navy px-4 py-3">
        <h3 className="text-primary-foreground text-sm font-semibold flex items-center gap-2">
          <Cake className="h-4 w-4" />
          Aniversariantes do Mês
        </h3>
      </div>
      <div className="p-4 max-h-[350px] overflow-y-auto space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-orange" />
          </div>
        ) : birthdays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">Nenhum aniversariante este mês.</p>
        ) : (
          <>
            {aniversariantesHoje.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-orange uppercase tracking-wider mb-2 border-b border-border pb-1">Hoje</h4>
                {aniversariantesHoje.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-orange flex items-center justify-center text-white shadow-md">
                      <Cake className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate" title={b.nome}>{b.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.depto}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aniversariantesMes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">Próximos / Passados</h4>
                {aniversariantesMes.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-secondary border border-border flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-muted-foreground">{b.data}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" title={b.nome}>{b.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.depto}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BirthdayWidget;
