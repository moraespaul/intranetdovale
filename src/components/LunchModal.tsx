import { useState, useEffect } from "react";
import { UtensilsCrossed, ChefHat, Plus, X, Info, Lock, LogOut } from "lucide-react";
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

interface RestauranteMenu {
  id: string;
  nome: string;
  misturas: string[];
  acompanhamentos: string[];
  tamanhos: Tamanho[];
}

interface LunchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultRestaurantes: RestauranteMenu[] = [
  { id: "1", nome: "Restaurante 1", misturas: [], acompanhamentos: [], tamanhos: [] },
  { id: "2", nome: "Restaurante 2", misturas: [], acompanhamentos: [], tamanhos: [] }
];

const LunchModal = ({ open, onOpenChange }: LunchModalProps) => {
  const [tab, setTab] = useState<"pedir" | "admin">("pedir");
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  // --- Auth state ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loggedUser, setLoggedUser] = useState<{ nome: string; usuario: string; token?: string } | null>(null);

  // --- Order state ---
  const [nomeColaborador, setNomeColaborador] = useState("");
  const [restauranteEscolhidoId, setRestauranteEscolhidoId] = useState<string>("");
  const [misturaEscolhida, setMisturaEscolhida] = useState("");
  const [tamanhoEscolhido, setTamanhoEscolhido] = useState("");
  const [acompsSelecionados, setAcompsSelecionados] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");

  // --- Admin state ---
  const [restaurantes, setRestaurantes] = useState<RestauranteMenu[]>(defaultRestaurantes);
  const [activeAdminRestId, setActiveAdminRestId] = useState<string>("1");

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
      if (cardapio.restaurantes) {
        setRestaurantes(cardapio.restaurantes);
        const firstAvailable = cardapio.restaurantes.find((r: RestauranteMenu) => r.misturas.length > 0 || r.tamanhos.length > 0);
        if (firstAvailable && !restauranteEscolhidoId) {
          setRestauranteEscolhidoId(firstAvailable.id);
        }
      } else {
        // Fallback para caso o cardápio antigo (sem a coluna restaurantes) seja carregado
        const legacyRest: RestauranteMenu = {
          id: "1",
          nome: "Restaurante Padrão",
          misturas: cardapio.misturas || [],
          acompanhamentos: cardapio.acompanhamentos || [],
          tamanhos: (cardapio.tamanhos as unknown as Tamanho[]) || [],
        };
        setRestaurantes([legacyRest, defaultRestaurantes[1]]);
        if (!restauranteEscolhidoId) setRestauranteEscolhidoId("1");
      }
    }
  }, [cardapio]);

  useEffect(() => {
    const rest = restaurantes.find(r => r.id === restauranteEscolhidoId);
    if (rest) {
      if (!rest.misturas.includes(misturaEscolhida)) {
        setMisturaEscolhida(rest.misturas[0] || "");
      }
      if (!rest.tamanhos.some(t => t.nome === tamanhoEscolhido)) {
        setTamanhoEscolhido(rest.tamanhos[0]?.nome || "");
      }
      setAcompsSelecionados(prev => {
        const valid = prev.filter(a => rest.acompanhamentos.includes(a));
        return valid.length !== prev.length ? valid : prev;
      });
    }
  }, [restauranteEscolhidoId, restaurantes]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha");
      return;
    }
    setIsAuthenticating(true);
    try {
      // Substitua pela URL da sua API de Autenticação do AD
      const API_URL = "https://api.dovale.com.br/LoginUsuario1";
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*"
        },
        body: JSON.stringify({ 
          usuario: username.trim(), 
          senha: password 
        }),
      });

      if (!response.ok) {
        throw new Error("Usuário ou senha inválidos");
      }

      // Lemos como texto primeiro para não quebrar caso a API retorne o token diretamente em string pura
      const rawResponse = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawResponse);
      } catch (e) {
        data = { token: rawResponse };
      }
      
      const nomeUsuario = data.nome || data.name || data.firstname || username;
      
      setLoggedUser({ nome: nomeUsuario, usuario: username, token: data.token || rawResponse });
      setNomeColaborador(nomeUsuario);
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      console.error("Erro na API de Login:", error);
      toast.error(error.message || "Erro ao realizar login");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const saveCardapio = useMutation({
    mutationFn: async () => {
      const payload = {
        data: today,
        restaurantes: restaurantes,
      };
      const { error } = await supabase
        .from("cardapio")
        .upsert(payload as any, { onConflict: "data" });
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
      if (!restauranteEscolhidoId) throw new Error("Selecione um restaurante");
      if (!misturaEscolhida) throw new Error("Selecione uma mistura");
      if (!tamanhoEscolhido) throw new Error("Selecione um tamanho");

      const rest = restaurantes.find((r) => r.id === restauranteEscolhidoId);
      const acompanhamentosFinal = acompsSelecionados.join(" + ");

      const { error } = await supabase.from("pedidos_almoco").insert({
        nome_colaborador: nomeColaborador.trim(),
        cardapio_id: cardapio?.id,
        restaurante: rest?.nome,
        mistura: misturaEscolhida,
        tamanho: tamanhoEscolhido,
        acompanhamento: acompanhamentosFinal || null,
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
      setAcompsSelecionados([]);
      setObservacoes("");
      setTimeout(() => onOpenChange(false), 1500);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao confirmar pedido"),
  });

  const activeRest = restaurantes.find((r) => r.id === activeAdminRestId) || restaurantes[0];

  const updateActiveRest = (updates: Partial<RestauranteMenu>) => {
    setRestaurantes((prev) =>
      prev.map((r) => (r.id === activeAdminRestId ? { ...r, ...updates } : r))
    );
  };

  const addMistura = () => {
    if (newMistura.trim()) {
      updateActiveRest({ misturas: [...activeRest.misturas, newMistura.trim().toUpperCase()] });
      setNewMistura("");
    }
  };

  const addAcomp = () => {
    if (newAcomp.trim()) {
      updateActiveRest({ acompanhamentos: [...activeRest.acompanhamentos, newAcomp.trim().toUpperCase()] });
      setNewAcomp("");
    }
  };

  const addTamanho = () => {
    if (newTamNome.trim() && newTamPreco.trim()) {
      updateActiveRest({ tamanhos: [...activeRest.tamanhos, { nome: newTamNome.trim(), preco: newTamPreco.trim() }] });
      setNewTamNome("");
      setNewTamPreco("");
    }
  };

  const removeMistura = (idx: number) => {
    updateActiveRest({ misturas: activeRest.misturas.filter((_, i) => i !== idx) });
  };
  const removeAcomp = (idx: number) => {
    updateActiveRest({ acompanhamentos: activeRest.acompanhamentos.filter((_, i) => i !== idx) });
  };
  const removeTamanho = (idx: number) => {
    updateActiveRest({ tamanhos: activeRest.tamanhos.filter((_, i) => i !== idx) });
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
            {!cardapio || !restaurantes.some((r) => r.misturas.length > 0 || r.tamanhos.length > 0) ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Cardápio ainda não cadastrado para hoje.
              </p>
            ) : (
              <>
                {/* Restaurante Selector */}
                <div>
                  <label className={labelClass}>Escolha o Restaurante</label>
                  <div className="grid grid-cols-2 gap-2">
                    {restaurantes.filter((r) => r.misturas.length > 0 || r.tamanhos.length > 0).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setRestauranteEscolhidoId(r.id)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                          restauranteEscolhidoId === r.id
                            ? "bg-orange/10 border-orange text-orange"
                            : "bg-background border-input text-foreground hover:bg-secondary"
                        }`}
                      >
                        {r.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {!loggedUser ? (
                  <div className="space-y-4 py-4 border-t border-border mt-4 animate-fade-in">
                    <div className="text-center space-y-2 mb-4">
                      <div className="mx-auto w-10 h-10 bg-orange/10 flex items-center justify-center rounded-full mb-2">
                        <Lock className="h-5 w-5 text-orange" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">Login Necessário</h3>
                      <p className="text-xs text-muted-foreground">
                        Utilize seu usuário e senha de rede para fazer o pedido.
                      </p>
                    </div>
                    <div>
                      <label className={labelClass}>Usuário AD</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ex: joao.silva"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Senha</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha de rede"
                        className={inputClass}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      />
                    </div>
                    <Button
                      variant="accent"
                      className="w-full"
                      onClick={handleLogin}
                      disabled={isAuthenticating}
                    >
                      {isAuthenticating ? "Autenticando..." : "Entrar"}
                    </Button>
                  </div>
                ) : (
                  (() => {
                    const selectedRest = restaurantes.find((r) => r.id === restauranteEscolhidoId);
                    if (!selectedRest) return null;

                    return (
                      <div className="space-y-4 animate-fade-in">
                      {/* Info banner */}
                      <div className="bg-accent/10 border border-orange/20 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-orange mt-0.5 shrink-0" />
                          <div className="text-xs text-foreground space-y-1">
                            <p className="font-semibold">{selectedRest.nome} - Cardápio do Dia</p>
                            <p>
                              <span className="font-semibold text-orange">MISTURA:</span>{" "}
                              {selectedRest.misturas.join(", ")}
                            </p>
                            <p>
                              <span className="font-semibold text-orange">ACOMPANHAMENTO:</span>{" "}
                              {selectedRest.acompanhamentos.join(", ")}
                            </p>
                            <p className="font-semibold">
                              PREÇO:{" "}
                              {selectedRest.tamanhos.map((t) => `${t.nome} R$${t.preco}`).join(" | ")}
                            </p>
                          </div>
                        </div>
                      </div>

                {/* Name */}
                <div>
                  <label className={labelClass}>Seu Nome</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nomeColaborador}
                      disabled
                      className={`${inputClass} bg-muted opacity-70 cursor-not-allowed flex-1`}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLoggedUser(null);
                        setPassword(""); // Limpa a senha por segurança
                      }}
                      title="Sair"
                      className="shrink-0 px-3"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
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
                      <option value="">Selecione...</option>
                      {selectedRest.misturas.map((m) => (
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
                      <option value="">Selecione...</option>
                      {selectedRest.tamanhos.map((t) => (
                        <option key={t.nome} value={t.nome}>
                          {t.nome} - R${t.preco}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Acompanhamentos */}
                <div>
                  <label className={labelClass}>Acompanhamentos (Máx. 2)</label>
                  <div className="space-y-2">
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        if (acompsSelecionados.includes(val)) return;
                        if (acompsSelecionados.length >= 2) {
                          toast.error("Você pode escolher no máximo 2 acompanhamentos.");
                          return;
                        }
                        setAcompsSelecionados([...acompsSelecionados, val]);
                      }}
                      disabled={acompsSelecionados.length >= 2}
                      className={selectClass}
                    >
                      <option value="">
                        {acompsSelecionados.length >= 2 ? "Limite de 2 atingido" : "Selecione para adicionar..."}
                      </option>
                      {selectedRest.acompanhamentos.map((a) => (
                        <option key={a} value={a} disabled={acompsSelecionados.includes(a)}>
                          {a}
                        </option>
                      ))}
                    </select>

                    {acompsSelecionados.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {acompsSelecionados.map((a) => (
                          <span key={a} className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2.5 py-1.5 rounded-md">
                            {a}
                            <button
                              type="button"
                              onClick={() => setAcompsSelecionados(acompsSelecionados.filter(item => item !== a))}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
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
                      </div>
                    );
                  })()
                )}
              </>
            )}
          </div>
        ) : (
          /* ===== ADMIN TAB ===== */
          <div className="space-y-5">
            {/* Tabs dos Restaurantes */}
            <div className="flex gap-2 bg-secondary/50 p-1 rounded-lg">
              {restaurantes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveAdminRestId(r.id)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeAdminRestId === r.id ? "bg-orange text-white shadow-sm" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {r.nome || "Restaurante"}
                </button>
              ))}
            </div>

            {/* Nome do Restaurante */}
            <div>
              <label className={labelClass}>Nome do Restaurante</label>
              <input
                type="text"
                value={activeRest.nome}
                onChange={(e) => updateActiveRest({ nome: e.target.value })}
                placeholder="Ex: Restaurante do Zé"
                className={inputClass}
              />
            </div>

            {/* Misturas */}
            <div>
              <label className={labelClass}>Misturas Disponíveis</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {activeRest.misturas.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2 py-1 rounded-md"
                  >
                    {m}
                    <button
                      onClick={() => removeMistura(i)}
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
                {activeRest.acompanhamentos.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2 py-1 rounded-md"
                  >
                    {a}
                    <button
                      onClick={() => removeAcomp(i)}
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
                {activeRest.tamanhos.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-secondary text-foreground text-xs px-3 py-2 rounded-md"
                  >
                    <span>{t.nome} — R${t.preco}</span>
                    <button
                      onClick={() => removeTamanho(i)}
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
                  className={`${inputClass} flex-1 min-w-[120px]`}
                />
                <input
                  type="text"
                  value={newTamPreco}
                  onChange={(e) => setNewTamPreco(e.target.value)}
                  placeholder="Preço"
                  className={`${inputClass} w-20 shrink-0`}
                />
                <Button variant="outline" size="icon" onClick={addTamanho} className="shrink-0">
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
