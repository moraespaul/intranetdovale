import { Activity } from "lucide-react";

const services = [
  { nome: "ERP", status: "online" },
  { nome: "E-mail Corporativo", status: "online" },
  { nome: "Sistema de Produção", status: "manutenção" },
  { nome: "Portal de Vendas", status: "online" },
];

const statusConfig = {
  online: { color: "bg-green-500", label: "Online" },
  offline: { color: "bg-destructive", label: "Offline" },
  "manutenção": { color: "bg-yellow-500", label: "Manutenção" },
};

const ServiceStatus = () => {
  return (
    <div className="bg-card rounded-xl card-shadow overflow-hidden">
      <div className="bg-navy px-4 py-3">
        <h3 className="text-primary-foreground text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Status dos Serviços
        </h3>
      </div>
      <div className="p-4 space-y-2.5">
        {services.map((s) => {
          const cfg = statusConfig[s.status as keyof typeof statusConfig];
          return (
            <div key={s.nome} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{s.nome}</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServiceStatus;
