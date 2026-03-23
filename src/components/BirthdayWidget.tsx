import { Cake } from "lucide-react";

const birthdays = [
  { nome: "Juliana Santos", depto: "Comercial" },
  { nome: "Carlos Eduardo", depto: "CAP" },
];

const BirthdayWidget = () => {
  return (
    <div className="bg-card rounded-xl card-shadow overflow-hidden">
      <div className="bg-navy px-4 py-3">
        <h3 className="text-primary-foreground text-sm font-semibold flex items-center gap-2">
          <Cake className="h-4 w-4" />
          Aniversariantes do Dia
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {birthdays.map((b) => (
          <div key={b.nome} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center text-orange text-xs font-bold">
              🎂
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{b.nome}</p>
              <p className="text-xs text-muted-foreground">{b.depto}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BirthdayWidget;
