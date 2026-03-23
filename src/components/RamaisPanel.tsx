import { Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RamaisPanel = () => {
  const { data: ramais = [] } = useQuery({
    queryKey: ["ramais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ramais")
        .select("*")
        .order("departamento")
        .order("ramal");
      if (error) throw error;
      return data;
    },
  });

  const departamentos = ramais.reduce<Record<string, typeof ramais>>((acc, r) => {
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
      <div className="divide-y divide-border">
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
                  className="px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-secondary/50 transition-colors"
                >
                  <span className="font-mono text-orange font-semibold text-xs w-10">{r.ramal}</span>
                  <span className="text-foreground truncate">{r.nome}</span>
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
