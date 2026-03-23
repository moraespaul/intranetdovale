import { Phone } from "lucide-react";
import { departamentos } from "@/data/ramais";

const RamaisPanel = () => {
  return (
    <div className="bg-card rounded-xl card-shadow overflow-hidden">
      <div className="bg-navy px-4 py-3">
        <h2 className="text-primary-foreground font-semibold text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Ramais
        </h2>
      </div>
      <div className="divide-y divide-border">
        {departamentos.map((dept) => (
          <div key={dept.nome}>
            <div className="bg-secondary px-4 py-2">
              <span className="text-xs font-bold text-foreground tracking-wider uppercase">
                {dept.nome}
              </span>
            </div>
            <ul className="divide-y divide-border/50">
              {dept.ramais.map((r) => (
                <li
                  key={r.ramal}
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
