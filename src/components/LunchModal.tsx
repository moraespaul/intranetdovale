import { useState, useEffect } from "react";
import { UtensilsCrossed, ChefHat, Plus, X, Info } from "lucide-react";
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

interface Tamanho {
  nome: string;
  preco: string;
}

interface LunchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LunchModal = ({ open, onOpenChange }: LunchModalProps) => {
  const [tab, setTab] = useState<"pedir" | "admin">("pedir");
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  // --- Order state ---
  const [nomeColaborador, setNomeColaborador] = useState("");
  const [misturaEscolhida, setMisturaEscolhida] = useState("");
  const [tamanhoEscolhido, setTamanhoEscolhido] = useState("");
  const [acompEscolhido, setAcompEscolhido] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // --- Admin state ---
  const [adminMisturas, setAdminMisturas] = useState<string[]>([]);
  const [adminAcomps, setAdminAcomps] = useState<string[]>([]);
  const [adminTamanhos, setAdminTamanhos] = useState<Tamanho[]>([]);
  const [newMistura, setNewMistura] = useState("");
  const [newAcomp, setNewAcomp] = useState("");
  const [newTamNome, setNewTamNome] = useState("");
  const [newTamPreco, setNewTamPreco] = useState("");

  const { data: cardapio } = useQuery({
    queryKey: ["cardapio", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cardapio")
        .select("*")
        .eq("data", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (cardapio) {
      setAdminMisturas(cardapio.misturas || []);
      setAdminAcomps(cardapio.acompanhamentos || []);
      setAdminTamanhos((cardapio.tamanhos as unknown as Tamanho[]) || []);
      if (!misturaEscolhida && cardapio.misturas?.length) {
        setMisturaEscolhida(cardapio.misturas[0]);
      }
      if (!tamanhoEscolhido && (cardapio.tamanhos as unknown as Tamanho[])?.length) {
        setTamanhoEscolhido((cardapio.tamanhos as unknown as Tamanho[])[0].nome);
      }
    }
  }, [cardapio]);

  const tamanhos = (cardapio?.tamanhos as unknown as Tamanho[]) || [];

  const saveCardapio = useMutation({
    mutationFn: async () => {
      const payload = {
        data: today,
        misturas: adminMisturas,
        acompanhamentos: adminAcomps,
        tamanhos: adminTamanhos as unknown as Record<string, unknown>[],
      };
      const { error } = await supabase
        .from("cardapio")
        .upsert(payload, { onConflict: "data" });
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
      if (!misturaEscolhida) throw new Error("Selecione uma mistura");
      if (!tamanhoEscolhido) throw new Error("Selecione um tamanho");
      const { error } = await supabase.from("pedidos_almoco").insert({
        nome_colaborador: nomeColaborador.trim(),
        cardapio_id: cardapio?.id,
        mistura: misturaEscolhida,
        tamanho: tamanhoEscolhido,
        acompanhamento: acompEscolhido || null,
        observacoes: observacoes || null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Você já fez pedido hoje!");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Pedido confirmado!");
      setNomeColaborador("");
      setObservacoes("");
      setTimeout(() => onOpenChange(false), 1500);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao confirmar pedido"),
  });

  const addMistura = () => {
    if (newMistura.trim()) {
      setAdminMisturas([...adminMisturas, newMistura.trim().toUpperCase()]);
      setNewMistura("");
    }
  };

  const addAcomp = () => {
    if (newAcomp.trim()) {
      setAdminAcomps([...adminAcomps, newAcomp.trim().toUpperCase()]);
      setNewAcomp("");
    }
  };

  const addTamanho = () => {
    if (newTamNome.trim() && newTamPreco.trim()) {
      setAdminTamanhos([...adminTamanhos, { nome: newTamNome.trim(), preco: newTamPreco.trim() }]);
      setNewTamNome("");
      setNewTamPreco("");
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:border-orange focus:outline-none transition-colors";
  const selectClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:border-orange focus:outline-none transition-colors appearance-none cursor-pointer";
  const labelClass = "text-xs font-semibold text-foreground uppercase block mb-1.5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UtensilsCrossed className="h-5 w-5 text-orange" />
            Solicitar Almoço
          </DialogTitle>
          <DialogDescription>
            Escolha sua marmita do dia.
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
            {!cardapio ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Cardápio ainda não cadastrado para hoje.
              </p>
            ) : (
              <>
                {/* Info banner */}
                <div className="bg-accent/10 border border-orange/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-orange mt-0.5 shrink-0" />
                    <div className="text-xs text-foreground space-y-1">
                      <p className="font-semibold">Cardápio do Dia</p>
                      <p>
                        <span className="font-semibold text-orange">MISTURA:</span>{" "}
                        {cardapio.misturas.join(", ")}
                      </p>
                      <p>
                        <span className="font-semibold text-orange">ACOMPANHAMENTO:</span>{" "}
                        {cardapio.acompanhamentos.join(", ")}
                      </p>
                      <p className="font-semibold">
                        PREÇO:{" "}
                        {tamanhos.map((t) => `${t.nome} R$${t.preco}`).join(" | ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className={labelClass}>Seu Nome</label>
                  <input
                    type="text"
                    value={nomeColaborador}
                    onChange={(e) => setNomeColaborador(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className={inputClass}
                  />
                </div>

                {/* Mistura + Tamanho */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Mistura</label>
                    <select
                      value={misturaEscolhida}
                      onChange={(e) => setMisturaEscolhida(e.target.value)}
                      className={selectClass}
                    >
                      {cardapio.misturas.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tamanho</label>
                    <select
                      value={tamanhoEscolhido}
                      onChange={(e) => setTamanhoEscolhido(e.target.value)}
                      className={selectClass}
                    >
                      {tamanhos.map((t) => (
                        <option key={t.nome} value={t.nome}>
                          {t.nome} - R${t.preco}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Acompanhamento */}
                <div>
                  <label className={labelClass}>Acompanhamento</label>
                  <select
                    value={acompEscolhido}
                    onChange={(e) => setAcompEscolhido(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Selecione...</option>
                    {cardapio.acompanhamentos.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Observações */}
                <div>
                  <label className={labelClass}>Observações</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Sem cebola, sem salada, adicionar ovo..."
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <Button
                  variant="accent"
                  className="w-full"
                  size="lg"
                  onClick={() => confirmOrder.mutate()}
                  disabled={confirmOrder.isPending || !nomeColaborador.trim()}
                >
                  {confirmOrder.isPending ? "Enviando..." : "Enviar Pedido"}
                </Button>
              </>
            )}
          </div>
        ) : (
          /* ===== ADMIN TAB ===== */
          <div className="space-y-5">
            {/* Misturas */}
            <div>
              <label className={labelClass}>Misturas Disponíveis</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {adminMisturas.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2 py-1 rounded-md"
                  >
                    {m}
                    <button
                      onClick={() => setAdminMisturas(adminMisturas.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMistura}
                  onChange={(e) => setNewMistura(e.target.value)}
                  placeholder="Nova mistura..."
                  className={`${inputClass} flex-1`}
                  onKeyDown={(e) => e.key === "Enter" && addMistura()}
                />
                <Button variant="outline" size="icon" onClick={addMistura}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Acompanhamentos */}
            <div>
              <label className={labelClass}>Acompanhamentos</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {adminAcomps.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2 py-1 rounded-md"
                  >
                    {a}
                    <button
                      onClick={() => setAdminAcomps(adminAcomps.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAcomp}
                  onChange={(e) => setNewAcomp(e.target.value)}
                  placeholder="Novo acompanhamento..."
                  className={`${inputClass} flex-1`}
                  onKeyDown={(e) => e.key === "Enter" && addAcomp()}
                />
                <Button variant="outline" size="icon" onClick={addAcomp}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tamanhos e preços */}
            <div>
              <label className={labelClass}>Tamanhos e Preços</label>
              <div className="space-y-1.5 mb-2">
                {adminTamanhos.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-secondary text-foreground text-xs px-3 py-2 rounded-md"
                  >
                    <span>{t.nome} — R${t.preco}</span>
                    <button
                      onClick={() => setAdminTamanhos(adminTamanhos.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTamNome}
                  onChange={(e) => setNewTamNome(e.target.value)}
                  placeholder="Nome (ex: Mini)"
                  className={`${inputClass} flex-1`}
                />
                <input
                  type="text"
                  value={newTamPreco}
                  onChange={(e) => setNewTamPreco(e.target.value)}
                  placeholder="Preço"
                  className={`${inputClass} w-24`}
                />
                <Button variant="outline" size="icon" onClick={addTamanho}>
                  <Plus className="h-4 w-4" />
                </Button>
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
