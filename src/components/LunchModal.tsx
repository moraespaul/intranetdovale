import { useState, useEffect } from "react";
import { UtensilsCrossed, X, Info, Lock, LogOut, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8000' : `http://${window.location.hostname}:8000`;

const LunchModal = ({ open, onOpenChange }: LunchModalProps) => {
  const queryClient = useQueryClient();
  
  // Gera a data atual no fuso horário local (YYYY-MM-DD) para evitar falhas de UTC
  const todayObj = new Date();
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  // --- Auth state ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loggedUser, setLoggedUser] = useState<{ nome: string; usuario: string; department: string; email: string; token?: string } | null>(null);

  // --- Order state ---
  const [nomeColaborador, setNomeColaborador] = useState("");
  const [restauranteEscolhidoId, setRestauranteEscolhidoId] = useState<string>("");
  const [misturaEscolhida, setMisturaEscolhida] = useState("");
  const [tamanhoEscolhido, setTamanhoEscolhido] = useState("");
  const [acompsSelecionados, setAcompsSelecionados] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // --- Navigation & History state ---
  const [activeView, setActiveView] = useState<"pedido" | "historico">("pedido");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroDia, setFiltroDia] = useState("");

  const [restaurantes, setRestaurantes] = useState<RestauranteMenu[]>(defaultRestaurantes);

  const { data: cardapio } = useQuery({
    queryKey: ["cardapio", today],
    queryFn: async () => {
      // Busca o cardápio da nova API em Python
      const response = await fetch(`${API_BASE_URL}/api/Cardapio?data=${today}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data;
    },
  });

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ["historico_pedidos", loggedUser?.nome],
    queryFn: async () => {
      if (!loggedUser?.nome) return [];
      const response = await fetch(`${API_BASE_URL}/api/HistoricoPedidos?usuario=${encodeURIComponent(loggedUser.nome)}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!loggedUser?.nome,
  });

  // Limpa o login e dados sempre que o modal principal for fechado
  useEffect(() => {
    if (!open) {
      setLoggedUser(null);
      setPassword("");
      setNomeColaborador("");
      setAcompsSelecionados([]);
      setObservacoes("");
      setShowConfirmPopup(false);
      setShowSuccessPopup(false);
      setActiveView("pedido");
      setFiltroMes("");
      setFiltroDia("");
    }
  }, [open]);

  useEffect(() => {
    if (cardapio) {
      if (cardapio.restaurantes) {
        setRestaurantes(cardapio.restaurantes);
        const firstAvailable = cardapio.restaurantes.find((r: RestauranteMenu) => r.misturas.length > 0);
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
          tamanhos: cardapio.tamanhos || [],
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
      if (rest.tamanhos && !rest.tamanhos.some(t => t.nome === tamanhoEscolhido)) {
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
      
      // Acessa as informações do usuário dentro da lista 'informacoesUsuario'
      const userInfo = data.informacoesUsuario && data.informacoesUsuario.length > 0 
        ? data.informacoesUsuario[0] 
        : data;
      
      const nomeUsuario = userInfo.displayname || userInfo.firstname || username;
      const userDept = userInfo.department || "";
      const userEmail = userInfo.emailaddress || "";
      
      setLoggedUser({ nome: nomeUsuario, usuario: username, department: userDept, email: userEmail, token: data.token || rawResponse });
      setNomeColaborador(nomeUsuario);
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      console.error("Erro na API de Login:", error);
      toast.error(error.message || "Erro ao realizar login");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const confirmOrder = useMutation({
    mutationFn: async (isForce: boolean = false) => {
      if (!nomeColaborador.trim()) throw new Error("Informe seu nome");
      if (!restauranteEscolhidoId) throw new Error("Selecione um restaurante");
      if (!misturaEscolhida) throw new Error("Selecione uma mistura");
      if (!tamanhoEscolhido) throw new Error("Selecione um tamanho");

      const rest = restaurantes.find((r) => r.id === restauranteEscolhidoId);
      const isSaborDoTiao = rest?.nome.toUpperCase().includes("SABOR DO TIÃO");
      const acompanhamentosFinal = isSaborDoTiao 
        ? (rest?.acompanhamentos || []).join(", ") 
        : acompsSelecionados.join(", ");

      // Payload estruturado exatamente com as colunas da sua tabela dbo.SOLICITAR_ALMOCO
      const payload = {
        DataCadastro: today,
        NomeSolicitante: loggedUser?.nome || "",
        EmailSolicitante: loggedUser?.email || "",
        SetorSolicitante: loggedUser?.department || "",
        Mistura: misturaEscolhida || "",
        Acompanhamento: acompanhamentosFinal || "",
        Tamanho: tamanhoEscolhido || "",
        Restaurante: rest?.nome || "",
        Obs: observacoes || "",
        StatusPedido: "Aberto",
        force: isForce
      };

      const response = await fetch(`${API_BASE_URL}/api/SolicitarAlmoco`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (response.status === 409 && !isForce) {
        throw new Error("NEEDS_CONFIRMATION");
      }

      if (!response.ok) {
        throw new Error("Erro ao salvar no banco SQL Server");
      }
    },
    onSuccess: () => {
      setAcompsSelecionados([]);
      setObservacoes("");
      queryClient.invalidateQueries({ queryKey: ["historico_pedidos"] });
      setShowConfirmPopup(false);
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 2000);
    },
    onError: (e: Error) => {
      if (e.message === "NEEDS_CONFIRMATION") {
        setShowConfirmPopup(true);
      } else {
        toast.error(e.message || "Erro ao confirmar pedido");
      }
    },
  });

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:border-orange focus:outline-none transition-colors";
  const selectClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:border-orange focus:outline-none transition-colors appearance-none cursor-pointer";
  const labelClass = "text-xs font-semibold text-foreground uppercase block mb-1.5";

  return (
    <>
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

          <div className="space-y-4">
            {!cardapio || !restaurantes.some((r) => r.misturas.length > 0) ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Cardápio ainda não cadastrado para hoje.
              </p>
            ) : (
              <>
                {!loggedUser ? (
                  <div className="space-y-4 py-2 animate-fade-in">
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
                      <div className="space-y-4 animate-fade-in">
                        {/* Conta Logada (Sempre Visível) */}
                        <div>
                          <label className={labelClass}>Conta Logada</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={nomeColaborador}
                              disabled
                              className={`${inputClass} bg-muted opacity-70 cursor-not-allowed flex-1`}
                            />
                            <Button variant="outline" onClick={() => { setLoggedUser(null); setPassword(""); }} title="Sair" className="shrink-0 px-3">
                              <LogOut className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>

                        {/* Abas Pedido/Histórico */}
                        <div className="flex gap-2 bg-secondary p-1 rounded-lg">
                          <button onClick={() => setActiveView("pedido")} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeView === "pedido" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/80"}`}>
                            Novo Pedido
                          </button>
                          <button onClick={() => setActiveView("historico")} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeView === "historico" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/80"}`}>
                            Meu Histórico
                          </button>
                        </div>

                        {activeView === "pedido" ? (
                          (() => {
                            const selectedRest = restaurantes.find((r) => r.id === restauranteEscolhidoId);
                            if (!selectedRest) return null;
                            return (
                              <div className="space-y-4 animate-fade-in">
                        {/* Restaurante Selector */}
                        <div>
                          <label className={labelClass}>Escolha o Restaurante</label>
                          <div className="grid grid-cols-2 gap-2">
                            {restaurantes.filter((r) => r.misturas.length > 0).map((r) => (
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
                              {(selectedRest.tamanhos || []).map((t) => `${t.nome} R$${t.preco}`).join(" | ")}
                            </p>
                          </div>
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
                      {(selectedRest.tamanhos || []).map((t) => (
                        <option key={t.nome} value={t.nome}>
                          {t.nome} - R${t.preco}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Acompanhamentos */}
                {selectedRest.nome.toUpperCase().includes("SABOR DO TIÃO") ? (
                  <div>
                    <label className={labelClass}>Acompanhamentos (Padrão do Restaurante)</label>
                    <div className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted text-muted-foreground text-sm opacity-80 cursor-not-allowed">
                      {selectedRest.acompanhamentos.length > 0 
                        ? selectedRest.acompanhamentos.join(", ") 
                        : "Nenhum acompanhamento cadastrado"}
                    </div>
                  </div>
                ) : (
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
                )}

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
                  onClick={() => confirmOrder.mutate(false)}
                  disabled={confirmOrder.isPending || !nomeColaborador.trim()}
                >
                  {confirmOrder.isPending ? "Enviando..." : "Enviar Pedido"}
                </Button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="space-y-4 animate-fade-in">
                            {/* Filtros de Histórico */}
                            <div className="flex gap-2">
                              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={selectClass}>
                                <option value="">Todos os Meses</option>
                                <option value="1">Janeiro</option>
                                <option value="2">Fevereiro</option>
                                <option value="3">Março</option>
                                <option value="4">Abril</option>
                                <option value="5">Maio</option>
                                <option value="6">Junho</option>
                                <option value="7">Julho</option>
                                <option value="8">Agosto</option>
                                <option value="9">Setembro</option>
                                <option value="10">Outubro</option>
                                <option value="11">Novembro</option>
                                <option value="12">Dezembro</option>
                              </select>
                              <input 
                                type="number" 
                                placeholder="Dia (1-31)" 
                                min="1" max="31" 
                                value={filtroDia} 
                                onChange={e => setFiltroDia(e.target.value)} 
                                className={inputClass} 
                              />
                            </div>
                            
                            {/* Lista de Histórico */}
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                              {(() => {
                                const historicoFiltrado = historico.filter((p: any) => {
                                  if (!p.DataCadastro) return false;
                                  const d = new Date(p.DataCadastro);
                                  const mesMatches = filtroMes ? (d.getMonth() + 1).toString() === filtroMes : true;
                                  const diaMatches = filtroDia ? d.getDate().toString() === filtroDia : true;
                                  return mesMatches && diaMatches;
                                });

                                if (loadingHistorico) return <p className="text-sm text-center text-muted-foreground py-4">Carregando histórico...</p>;
                                if (historicoFiltrado.length === 0) return <p className="text-sm text-center text-muted-foreground py-4">Nenhum pedido encontrado no período.</p>;

                                return historicoFiltrado.map((p: any) => (
                                  <div key={p.Id || p.id} className="bg-secondary/50 p-4 rounded-lg border border-border text-sm flex flex-col gap-1.5">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-bold text-orange text-base">{new Date(p.DataCadastro).toLocaleDateString('pt-BR')}</span>
                                      <span className="bg-background px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border border-border text-muted-foreground">{p.StatusPedido}</span>
                                    </div>
                                    <p><strong className="text-foreground font-medium">Local:</strong> {p.Restaurante}</p>
                                    <p><strong className="text-foreground font-medium">Pedido:</strong> {p.Tamanho} - {p.Mistura}</p>
                                    {p.Acompanhamento && <p><strong className="text-foreground font-medium">Acomps:</strong> {p.Acompanhamento}</p>}
                                    {p.Obs && <p className="text-destructive font-medium mt-1">Obs: {p.Obs}</p>}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
              </>
            )}
          </div>
      </DialogContent>
    </Dialog>

      {/* Popup de Confirmação do 2º Pedido */}
      <Dialog open={showConfirmPopup} onOpenChange={setShowConfirmPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange flex items-center gap-2">
              <Info className="h-5 w-5" />
              Aviso de Duplicidade
            </DialogTitle>
            <DialogDescription className="text-base text-foreground mt-4 leading-relaxed">
              Você já solicitou uma marmita hoje!
              <br /><br />
              Deseja realmente fazer um segundo pedido em seu nome?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={() => setShowConfirmPopup(false)}>
              Não, cancelar
            </Button>
            <Button 
              variant="accent" 
              onClick={() => confirmOrder.mutate(true)}
              disabled={confirmOrder.isPending}
            >
              {confirmOrder.isPending ? "Enviando..." : "Sim, pedir outra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup de Sucesso */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="sm:max-w-sm flex flex-col items-center justify-center p-6 text-center [&>button]:hidden">
          <div className="w-16 h-16 bg-green-100 text-green-600 flex items-center justify-center rounded-full mb-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Pedido Realizado!
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            Seu almoço foi solicitado com sucesso.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LunchModal;
