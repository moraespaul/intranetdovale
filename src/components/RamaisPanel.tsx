import { Phone, Search } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const RamaisPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: ramais = [] } = useQuery({
    queryKey: ["ramais"],
    queryFn: async () => {
      // 1. Substitua pela URL real da sua API
      const API_URL = "https://api.dovale.com.br/AD/InformacoesDosUsuariosAtivos"; 
      
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error("Erro ao carregar dados da API do AD");
      }
      
      const rawData = await response.json();

      // 2. Mapeie os dados da sua API para o formato que o painel usa
      // Substitua `item.setor`, `item.numero_ramal` e `item.nome_completo`
      // pelos nomes corretos dos campos que vêm na sua API.
      const mappedData = rawData
        .filter((item: any) => item.telephonenumber && item.telephonenumber.trim() !== "")
        .map((item: any, index: number) => ({
          id: item.id || String(index),
          departamento: item.department || "Outros", // Campo do departamento/setor
          ramal: item.telephonenumber,               // Campo do ramal
          nome: item.name || "Sem Nome",             // Campo do nome do funcionário
          local: item.escritorio || "Sem Local"
        }));

      // 3. Ordena por departamento e depois por ramal (já que tiramos a ordenação do Supabase)
      mappedData.sort((a: any, b: any) => {
        if (a.departamento === b.departamento) {
          return a.ramal.localeCompare(b.ramal);
        }
        return a.departamento.localeCompare(b.departamento);
      });

      return mappedData;
    },
  });

  const filteredRamais = ramais.filter((r) => {
    const q = searchQuery.toLowerCase();
    return r.nome.toLowerCase().includes(q) || r.ramal.includes(q);
  });

  const departamentos = filteredRamais.reduce<Record<string, typeof ramais>>((acc, r) => {
    if (!acc[r.departamento]) acc[r.departamento] = [];
    acc[r.departamento].push(r);
    return acc;
  }, {});

  const deptOrder = ["CAP", "CAR", "COMERCIAL", "COMPRAS", "PRODUÇÃO"];
  const sortedDepts = Object.keys(departamentos).sort(
    (a, b) => (deptOrder.indexOf(a) === -1 ? 99 : deptOrder.indexOf(a)) - (deptOrder.indexOf(b) === -1 ? 99 : deptOrder.indexOf(b))
  );

  return (
    <div className="bg-card rounded-xl card-shadow overflow-hidden">
      <div className="bg-navy px-4 py-3">
        <h2 className="text-primary-foreground font-semibold text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Ramais
        </h2>
      </div>

      {/* Campo de Pesquisa */}
      <div className="p-3 border-b border-border bg-background/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ramal ou nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-input bg-background text-sm focus:border-orange focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Adicionamos uma altura máxima calculada e uma barra de rolagem automática */}
      <div 
        className="divide-y divide-border overflow-y-auto max-h-[calc(100vh-14rem)]"
      >
        {sortedDepts.map((dept) => (
          <div key={dept}>
            <div className="bg-secondary px-4 py-2">
              <span className="text-xs font-bold text-foreground tracking-wider uppercase">
                {dept}
              </span>
            </div>
            <ul className="divide-y divide-border/50">
              {departamentos[dept].map((r) => (
                <li
                  key={r.id}
                  className="px-4 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-mono text-orange font-semibold text-xs w-10 shrink-0">{r.ramal}</span>
                    <span className="text-foreground truncate">{r.nome}</span>
                  </div>
                  <span className="text-[10px] bg-background text-muted-foreground border border-border px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                    {r.local}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RamaisPanel;
