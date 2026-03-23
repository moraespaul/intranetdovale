import { useState } from "react";
import { UtensilsCrossed, ChefHat, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LunchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LunchModal = ({ open, onOpenChange }: LunchModalProps) => {
  const [tab, setTab] = useState<"pedir" | "admin">("pedir");
  const [confirmed, setConfirmed] = useState(false);

  // Admin state
  const [proteina, setProteina] = useState("Frango Grelhado");
  const [acompanhamento, setAcompanhamento] = useState("Arroz e Feijão");
  const [salada, setSalada] = useState("Alface, Tomate e Cenoura");
  const [saved, setSaved] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      onOpenChange(false);
    }, 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UtensilsCrossed className="h-5 w-5 text-orange" />
            Almoço do Dia
          </DialogTitle>
          <DialogDescription>
            Confirme seu pedido ou cadastre o cardápio.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setTab("pedir")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === "pedir" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Fazer Pedido
          </button>
          <button
            onClick={() => setTab("admin")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === "admin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <ChefHat className="h-3.5 w-3.5" /> Admin
            </span>
          </button>
        </div>

        {tab === "pedir" ? (
          <div className="space-y-4">
            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <div>
                <span className="text-xs font-semibold text-orange uppercase">Proteína</span>
                <p className="text-foreground font-medium">{proteina}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-orange uppercase">Acompanhamento</span>
                <p className="text-foreground font-medium">{acompanhamento}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-orange uppercase">Salada</span>
                <p className="text-foreground font-medium">{salada}</p>
              </div>
            </div>

            {confirmed ? (
              <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-medium animate-fade-in">
                <Check className="h-5 w-5" />
                Pedido confirmado!
              </div>
            ) : (
              <Button variant="accent" className="w-full" size="lg" onClick={handleConfirm}>
                Confirmar Pedido
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1">Proteína</label>
                <input
                  type="text"
                  value={proteina}
                  onChange={(e) => setProteina(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:border-orange focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1">Acompanhamento</label>
                <input
                  type="text"
                  value={acompanhamento}
                  onChange={(e) => setAcompanhamento(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:border-orange focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1">Salada</label>
                <input
                  type="text"
                  value={salada}
                  onChange={(e) => setSalada(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:border-orange focus:outline-none transition-colors"
                />
              </div>
            </div>

            {saved ? (
              <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-medium animate-fade-in">
                <Check className="h-5 w-5" />
                Cardápio salvo!
              </div>
            ) : (
              <Button variant="navy" className="w-full" size="lg" onClick={handleSave}>
                Salvar Cardápio
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LunchModal;
