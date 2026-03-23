import { useState } from "react";
import { UtensilsCrossed, ChefHat, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [proteina, setProteina] = useState("");
  const [acompanhamento, setAcompanhamento] = useState("");
  const [salada, setSalada] = useState("");
  const [nomeColaborador, setNomeColaborador] = useState("");
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];

  const { data: cardapio } = useQuery({
    queryKey: ["cardapio", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cardapio")
        .select("*")
        .eq("data", today)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProteina(data.proteina);
        setAcompanhamento(data.acompanhamento);
        setSalada(data.salada);
      }
      return data;
    },
  });

  const saveCardapio = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("cardapio")
        .upsert({ data: today, proteina, acompanhamento, salada }, { onConflict: "data" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cardápio salvo!");
      queryClient.invalidateQueries({ queryKey: ["cardapio"] });
    },
    onError: () => toast.error("Erro ao salvar cardápio"),
  });

  const confirmOrder = useMutation({
    mutationFn: async () => {
      if (!nomeColaborador.trim()) throw new Error("Informe seu nome");
      const { error } = await supabase
        .from("pedidos_almoco")
        .insert({ nome_colaborador: nomeColaborador.trim(), cardapio_id: cardapio?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido confirmado!");
      setNomeColaborador("");
      setTimeout(() => onOpenChange(false), 1500);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao confirmar pedido"),
  });

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
            {cardapio ? (
              <div className="bg-secondary rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-orange uppercase">Proteína</span>
                  <p className="text-foreground font-medium">{cardapio.proteina}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-orange uppercase">Acompanhamento</span>
                  <p className="text-foreground font-medium">{cardapio.acompanhamento}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-orange uppercase">Salada</span>
                  <p className="text-foreground font-medium">{cardapio.salada}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                Cardápio ainda não cadastrado para hoje.
              </p>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground uppercase block mb-1">Seu Nome</label>
              <input
                type="text"
                value={nomeColaborador}
                onChange={(e) => setNomeColaborador(e.target.value)}
                placeholder="Digite seu nome completo"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:border-orange focus:outline-none transition-colors"
              />
            </div>

            <Button
              variant="accent"
              className="w-full"
              size="lg"
              onClick={() => confirmOrder.mutate()}
              disabled={confirmOrder.isPending || !nomeColaborador.trim()}
            >
              {confirmOrder.isPending ? "Confirmando..." : "Confirmar Pedido"}
            </Button>
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

            <Button
              variant="navy"
              className="w-full"
              size="lg"
              onClick={() => saveCardapio.mutate()}
              disabled={saveCardapio.isPending}
            >
              {saveCardapio.isPending ? "Salvando..." : "Salvar Cardápio"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LunchModal;
