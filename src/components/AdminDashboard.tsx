import { useState, useEffect } from "react";
import { ChefHat, ListOrdered, Newspaper, Plus, X, Lock, LogOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const defaultRestaurantes: RestauranteMenu[] = [
  { id: "1", nome: "Restaurante 1", misturas: [], acompanhamentos: [], tamanhos: [] },
  { id: "2", nome: "Restaurante 2", misturas: [], acompanhamentos: [], tamanhos: [] }
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<"cardapio" | "pedidos" | "posts">("pedidos");
  const queryClient = useQueryClient();
  
  // Gera a data atual no fuso horário local (YYYY-MM-DD) garantindo que nunca "pule" de dia antes da meia-noite local
  const todayObj = new Date();
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  // --- Estados de Autenticação Admin ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loggedAdmin, setLoggedAdmin] = useState<{ nome: string; usuario: string; department: string } | null>(null);

  // --- Estados do Cardápio ---
  const [restaurantes, setRestaurantes] = useState<RestauranteMenu[]>(defaultRestaurantes);
  const [activeAdminRestId, setActiveAdminRestId] = useState<string>("1");
  const [newMistura, setNewMistura] = useState("");
  const [newAcomp, setNewAcomp] = useState("");
  const [newTamNome, setNewTamNome] = useState("");
  const [newTamPreco, setNewTamPreco] = useState("");

  // Buscando Cardápio de Hoje
  const { data: cardapio } = useQuery({
    queryKey: ["cardapio", today],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000/api/Cardapio?data=${today}`);
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // Buscando Pedidos de Hoje
  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ["pedidos_almoco", today],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000/api/SolicitarAlmoco?data=${today}`);
      if (!response.ok) return [];
      return await response.json();
    },
  });

  useEffect(() => {
    if (cardapio?.restaurantes && cardapio.restaurantes.length > 0) {
      setRestaurantes(cardapio.restaurantes);
    } else {
      setRestaurantes(defaultRestaurantes);
    }
  }, [cardapio]);

  // Salvar Cardápio
  const saveCardapio = useMutation({
    mutationFn: async () => {
      const response = await fetch("http://localhost:8000/api/Cardapio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: today, restaurantes })
      });
      if (!response.ok) throw new Error("Erro ao salvar cardápio no SQL Server");
    },
    onSuccess: () => {
      toast.success("Cardápio salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["cardapio"] });
    },
    onError: () => toast.error("Erro ao salvar cardápio"),
  });

  // Helpers do Cardápio
  const activeRest = restaurantes.find((r) => r.id === activeAdminRestId) || restaurantes[0] || defaultRestaurantes[0];
  const updateActiveRest = (updates: Partial<RestauranteMenu>) => {
    setRestaurantes((prev) => prev.map((r) => (r.id === activeAdminRestId ? { ...r, ...updates } : r)));
  };

  const handleNovoCardapio = () => {
    if (confirm("Deseja limpar as misturas e acompanhamentos para criar um novo cardápio? Os tamanhos e preços serão mantidos.")) {
      setRestaurantes((prev) => prev.map(r => ({ ...r, misturas: [], acompanhamentos: [] })));
      toast.success("Cardápio limpo.");
    }
  };

  const addMistura = () => {
    if (newMistura.trim()) {
      updateActiveRest({ misturas: [...(activeRest.misturas || []), newMistura.trim().toUpperCase()] });
      setNewMistura("");
    }
  };

  const addAcomp = () => {
    if (newAcomp.trim()) {
      updateActiveRest({ acompanhamentos: [...(activeRest.acompanhamentos || []), newAcomp.trim().toUpperCase()] });
      setNewAcomp("");
    }
  };

  const addTamanho = () => {
    if (newTamNome.trim() && newTamPreco.trim()) {
      updateActiveRest({ tamanhos: [...(activeRest.tamanhos || []), { nome: newTamNome.trim(), preco: newTamPreco.trim() }] });
      setNewTamNome("");
      setNewTamPreco("");
    }
  };

  // Agrupando pedidos por restaurante
  const pedidosAgrupados = pedidos.reduce((acc: any, pedido: any) => {
    // Ajuste para o nome da coluna vindo do SQL Server
    const rest = pedido.Restaurante || pedido.restaurante || "Desconhecido";
    if (!acc[rest]) acc[rest] = [];
    acc[rest].push(pedido);
    return acc;
  }, {});

  const handleGeneratePDF = async () => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    
    for (const [nomeRestaurante, listaPedidos] of Object.entries(pedidosAgrupados) as [string, any[]][]) {
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Relatorio de Pedidos - ${nomeRestaurante}`, 14, 15);
      
      let yPos = 25;

      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12); // Cor Laranja
      doc.text(`Data: ${todayStr} | Total: ${listaPedidos.length} marmita(s)`, 14, yPos);
      yPos += 5;

      const tableData = listaPedidos.map((p: any) => [
        p.DataCadastro ? new Date(p.DataCadastro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "-",
        p.NomeSolicitante || p.nome_colaborador || "-",
        p.Tamanho || p.tamanho || "-",
        p.Mistura || p.mistura || "-",
        p.Acompanhamento || p.acompanhamento || "-",
        p.Obs || p.observacoes || "-"
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Horário', 'Colaborador', 'Tamanho', 'Mistura', 'Acomps', 'Obs']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] }, // bg-navy
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 35 },
          2: { cellWidth: 20 },
          3: { cellWidth: 40 },
          4: { cellWidth: 45 },
          5: { cellWidth: 'auto' }
        }
      });

      // Substitui espaços e acentos no nome do arquivo para evitar erros ao baixar
      const safeName = nomeRestaurante.replace(/[^a-z0-9]/gi, '_');
      const fileName = `Pedidos_${safeName}_${todayStr.replace(/\//g, '-')}.pdf`;

      try {
        // Verifica se o navegador suporta a API de escolha de diretório (Chrome, Edge, etc.)
        if ('showSaveFilePicker' in window) {
          const showSaveFilePicker = (window as any).showSaveFilePicker;
          const fileHandle = await showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'Arquivo PDF',
              accept: { 'application/pdf': ['.pdf'] },
            }],
          });
          const writable = await fileHandle.createWritable();
          const blob = doc.output('blob');
          await writable.write(blob);
          await writable.close();
        } else {
          // Fallback para navegadores que não suportam
          doc.save(fileName);
        }
      } catch (error: any) {
        // Ignora o erro se o usuário apenas clicar em "Cancelar" na janela do Windows
        if (error.name !== 'AbortError') {
          console.error('Erro ao salvar PDF:', error);
          doc.save(fileName); // Fallback de emergência
        }
      }
    }
  };

  // Função de Login AD Restrita
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha");
      return;
    }
    setIsAuthenticating(true);
    try {
      const API_URL = "https://api.dovale.com.br/LoginUsuario1";
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*"
        },
        body: JSON.stringify({ usuario: username.trim(), senha: password }),
      });

      if (!response.ok) throw new Error("Usuário ou senha inválidos");

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

      // Extrai o departamento retornado pela API
      const userDept = userInfo.department || "";
      const deptFormatado = userDept.toUpperCase();
      
      // Validação dos departamentos permitidos
      if (!["TIC", "RH", "RECEPCAO", "RECEPÇÃO"].includes(deptFormatado)) {
        throw new Error("Acesso negado: Seu departamento não possui permissão de administrador.");
      }

      const nomeUsuario = userInfo.displayname || userInfo.firstname || username;
      setLoggedAdmin({ nome: nomeUsuario, usuario: username, department: userDept });
      toast.success("Acesso liberado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar login");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:border-orange focus:outline-none transition-colors";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="bg-navy px-6 py-4 rounded-xl shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel de Administração</h1>
          <p className="text-primary-foreground/70 text-sm">Gerencie o portal da intranet</p>
        </div>
        {loggedAdmin && (
          <Button variant="outline" onClick={() => setLoggedAdmin(null)} size="sm" className="gap-2 bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        )}
      </div>

      {!loggedAdmin ? (
        <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-8 card-shadow mt-12 animate-fade-in space-y-5">
          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto w-14 h-14 bg-orange/10 flex items-center justify-center rounded-full mb-3">
              <Lock className="h-7 w-7 text-orange" />
            </div>
            <h3 className="font-bold text-foreground text-xl">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Apenas colaboradores dos departamentos TIC, RH ou Recepção possuem acesso ao painel.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Usuário AD</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder="Ex: maria.silva"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Sua senha de rede"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <Button variant="accent" className="w-full mt-2" size="lg" onClick={handleLogin} disabled={isAuthenticating}>
            {isAuthenticating ? "Verificando permissões..." : "Entrar no Painel"}
          </Button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-accent/10 border border-orange/20 rounded-lg p-3 text-sm text-foreground flex items-center gap-2">
            Olá, <strong>{loggedAdmin.nome}</strong>. Você está logado como administrador ({loggedAdmin.department}).
          </div>

      {/* Abas de Navegação Admin */}
      <div className="flex gap-2 bg-card p-1.5 rounded-xl border border-border card-shadow overflow-x-auto">
        <button
          onClick={() => setActiveTab("pedidos")}
          className={`flex-1 min-w-[150px] py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === "pedir" ? "bg-orange text-white shadow-md" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <ListOrdered className="h-4 w-4" /> Relatório de Pedidos
        </button>
        <button
          onClick={() => setActiveTab("cardapio")}
          className={`flex-1 min-w-[150px] py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === "cardapio" ? "bg-orange text-white shadow-md" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <ChefHat className="h-4 w-4" /> Gerenciar Cardápio
        </button>
        {!["RECEPCAO", "RECEPÇÃO"].includes(loggedAdmin.department.toUpperCase()) && (
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 min-w-[150px] py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === "posts" ? "bg-orange text-white shadow-md" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Newspaper className="h-4 w-4" /> Publicar Notícias
          </button>
        )}
      </div>

      {/* CONTEÚDO: PEDIDOS */}
      {activeTab === "pedidos" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-5 card-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Pedidos de Hoje ({new Date().toLocaleDateString('pt-BR')})</h2>
              {pedidos.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="gap-2 border-orange text-orange hover:bg-orange hover:text-white transition-colors">
                  <Download className="h-4 w-4" /> Gerar PDF
                </Button>
              )}
            </div>
            
            {loadingPedidos ? (
              <p className="text-muted-foreground text-sm">Carregando pedidos...</p>
            ) : pedidos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum pedido realizado hoje ainda.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(pedidosAgrupados).map(([nomeRestaurante, listaPedidos]: any) => (
                  <div key={nomeRestaurante} className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-secondary px-4 py-3 flex justify-between items-center">
                      <h3 className="font-bold text-foreground">{nomeRestaurante}</h3>
                      <span className="bg-orange text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {listaPedidos.length} {listaPedidos.length === 1 ? 'marmita' : 'marmitas'}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-card border-b border-border text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2 font-medium">Horário</th>
                            <th className="px-4 py-2 font-medium">Colaborador</th>
                            <th className="px-4 py-2 font-medium">Tamanho</th>
                            <th className="px-4 py-2 font-medium">Mistura</th>
                            <th className="px-4 py-2 font-medium">Acompanhamentos</th>
                            <th className="px-4 py-2 font-medium">Observações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {listaPedidos.map((p: any) => (
                            <tr key={p.id || p.Id} className="bg-card hover:bg-secondary/30">
                              <td className="px-4 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                {p.DataCadastro ? new Date(p.DataCadastro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "-"}
                              </td>
                              <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap">{p.NomeSolicitante || p.nome_colaborador}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{p.Tamanho || p.tamanho}</td>
                              <td className="px-4 py-2">{p.Mistura || p.mistura}</td>
                              <td className="px-4 py-2">{p.Acompanhamento || p.acompanhamento || "-"}</td>
                              <td className="px-4 py-2 text-destructive">{p.Obs || p.observacoes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO: CARDÁPIO */}
      {activeTab === "cardapio" && (
        <div className="bg-card border border-border rounded-xl p-5 card-shadow space-y-5 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Montar Cardápio de Hoje</h2>
            <Button variant="destructive" size="sm" onClick={handleNovoCardapio}>
              Limpar / Novo Cardápio
            </Button>
          </div>
          
          <div className="flex gap-2 bg-secondary/50 p-1.5 rounded-lg">
            {restaurantes.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveAdminRestId(r.id)}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                  activeAdminRestId === r.id ? "bg-orange text-white shadow-sm" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {r.nome || "Restaurante"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Nome do Restaurante</label>
              <input type="text" value={activeRest.nome} onChange={(e) => updateActiveRest({ nome: e.target.value })} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Misturas</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(activeRest.misturas || []).map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-secondary text-xs px-2 py-1 rounded-md">{m}
                      <button onClick={() => updateActiveRest({ misturas: (activeRest.misturas || []).filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newMistura} onChange={(e) => setNewMistura(e.target.value)} placeholder="Nova mistura..." className={inputClass} onKeyDown={(e) => e.key === "Enter" && addMistura()} />
                  <Button variant="outline" size="icon" onClick={addMistura}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Acompanhamentos</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(activeRest.acompanhamentos || []).map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-secondary text-xs px-2 py-1 rounded-md">{a}
                      <button onClick={() => updateActiveRest({ acompanhamentos: (activeRest.acompanhamentos || []).filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newAcomp} onChange={(e) => setNewAcomp(e.target.value)} placeholder="Novo acomp..." className={inputClass} onKeyDown={(e) => e.key === "Enter" && addAcomp()} />
                  <Button variant="outline" size="icon" onClick={addAcomp}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Tamanhos e Preços</label>
              <div className="space-y-1.5 mb-2">
                {(activeRest.tamanhos || []).map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary text-xs px-3 py-2 rounded-md">
                    <span>{t.nome} — R${t.preco}</span>
                    <button onClick={() => updateActiveRest({ tamanhos: (activeRest.tamanhos || []).filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newTamNome} onChange={(e) => setNewTamNome(e.target.value)} placeholder="Tamanho" className={inputClass} />
                <input type="text" value={newTamPreco} onChange={(e) => setNewTamPreco(e.target.value)} placeholder="Preço" className={`${inputClass} w-24`} />
                <Button variant="outline" size="icon" onClick={addTamanho}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <Button variant="accent" className="w-full mt-4" onClick={() => saveCardapio.mutate()} disabled={saveCardapio.isPending}>
              {saveCardapio.isPending ? "Salvando..." : "Salvar e Publicar Cardápio"}
            </Button>
          </div>
        </div>
      )}

      {/* CONTEÚDO: POSTS / NOTÍCIAS */}
      {activeTab === "posts" && !["RECEPCAO", "RECEPÇÃO"].includes(loggedAdmin.department.toUpperCase()) && (
        <div className="bg-card border border-border rounded-xl p-5 card-shadow animate-fade-in text-center py-12 space-y-4">
          <div className="w-12 h-12 bg-orange/10 flex items-center justify-center rounded-full mx-auto">
            <Newspaper className="h-6 w-6 text-orange" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Gerenciador de Notícias</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            A interface para criação de postagens está pronta. Em breve, conectaremos esta tela com a tabela <code className="bg-secondary px-1 py-0.5 rounded text-xs">noticias</code> do banco de dados para publicação em tempo real.
          </p>
          <Button variant="outline" disabled>Recurso em Desenvolvimento</Button>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;