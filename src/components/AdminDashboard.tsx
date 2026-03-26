import { useState, useEffect } from "react";
import { ChefHat, ListOrdered, Newspaper, Plus, X, Lock, LogOut, Download, MessageCircle, Info, Paperclip, Cake, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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

interface AniversarianteAdmin {
  Id: number;
  Funcionario: string;
  Setor: string;
  DataNascimento: string; // YYYY-MM-DD
}

const defaultRestaurantes: RestauranteMenu[] = [
  { id: "1", nome: "Restaurante 1", misturas: [], acompanhamentos: [], tamanhos: [] },
  { id: "2", nome: "Restaurante 2", misturas: [], acompanhamentos: [], tamanhos: [] }
];

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8000' : `http://${window.location.hostname}:8000`;

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<"cardapio" | "pedidos" | "posts" | "aniversariantes">("pedidos");
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

  // --- Estados de Notícias ---
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [tituloNoticia, setTituloNoticia] = useState("");
  const [resumoNoticia, setResumoNoticia] = useState("");
  const [imagemNoticia, setImagemNoticia] = useState("");
  const [anexosNoticia, setAnexosNoticia] = useState<{nome: string, conteudo: string, url?: string}[]>([]);
  
  // --- Estados de Exclusão de Notícia ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDeleteId, setPostToDeleteId] = useState<string | null>(null);

  // --- Estados de Aniversariantes ---
  const [editingAniversarianteId, setEditingAniversarianteId] = useState<number | null>(null);
  const [nomeFuncionario, setNomeFuncionario] = useState("");
  const [setorFuncionario, setSetorFuncionario] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [showDeleteAniversarianteConfirm, setShowDeleteAniversarianteConfirm] = useState(false);
  const [aniversarianteToDeleteId, setAniversarianteToDeleteId] = useState<number | null>(null);
  const [buscaAniversariante, setBuscaAniversariante] = useState("");

  // Buscando Cardápio de Hoje
  const { data: cardapio } = useQuery({
    queryKey: ["cardapio", today],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/Cardapio?data=${today}`);
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // Buscando Pedidos de Hoje
  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ["pedidos_almoco", today],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/SolicitarAlmoco?data=${today}`);
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Buscando Notícias (Para exibir a lista de exclusão/edição)
  const { data: noticias = [] } = useQuery({
    queryKey: ["noticias"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/Noticias`);
      if (!response.ok) return [];
      return await response.json();
    }
  });

  // Buscando TODOS os Aniversariantes (para o painel de admin)
  const { data: aniversariantes = [], isLoading: loadingAniversariantes } = useQuery<AniversarianteAdmin[]>({
    queryKey: ["aniversariantes_all"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/Aniversariantes/all`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!loggedAdmin, // Apenas busca se o admin estiver logado
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
      const response = await fetch(`${API_BASE_URL}/api/Cardapio`, {
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

  // Salvar Notícia
  const saveNoticia = useMutation({
    mutationFn: async () => {
      // Remove tags HTML e espaços para validar se o conteúdo está realmente vazio
      const isContentEmpty = !resumoNoticia || resumoNoticia.replace(/<[^>]*>/g, '').trim() === '';

      if (!tituloNoticia.trim() || isContentEmpty || !imagemNoticia) {
        throw new Error("Título, Conteúdo e Imagem de capa são obrigatórios.");
      }
      
      const method = editingPostId ? "PUT" : "POST";
      const url = editingPostId 
        ? `${API_BASE_URL}/api/Noticias/${editingPostId}` 
        : `${API_BASE_URL}/api/Noticias`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: tituloNoticia,
          resumo: resumoNoticia,
          autor: loggedAdmin?.nome || "Admin",
          imagem: imagemNoticia,
          anexos: anexosNoticia
        })
      });
      if (!response.ok) throw new Error("Erro ao salvar notícia no servidor.");
    },
    onSuccess: () => {
      toast.success(editingPostId ? "Notícia atualizada com sucesso!" : "Notícia publicada com sucesso!");
      setTituloNoticia("");
      setResumoNoticia("");
      setImagemNoticia("");
      setAnexosNoticia([]);
      setEditingPostId(null);
      queryClient.invalidateQueries({ queryKey: ["noticias"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Excluir Notícia
  const deleteNoticia = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/api/Noticias/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao excluir a notícia.");
    },
    onSuccess: () => {
      toast.success("Notícia excluída com sucesso!");
      // Se a notícia excluída era a que estava em edição, limpa o formulário
      if (editingPostId === postToDeleteId) {
        cancelEdit();
      }
      setPostToDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["noticias"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Salvar/Atualizar Aniversariante
  const saveAniversariante = useMutation({
    mutationFn: async () => {
      if (!nomeFuncionario.trim() || !setorFuncionario.trim() || !dataNascimento) {
        throw new Error("Todos os campos são obrigatórios.");
      }
      
      const method = editingAniversarianteId ? "PUT" : "POST";
      const url = editingAniversarianteId 
        ? `${API_BASE_URL}/api/Aniversariantes/${editingAniversarianteId}` 
        : `${API_BASE_URL}/api/Aniversariantes`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Funcionario: nomeFuncionario,
          Setor: setorFuncionario,
          DataNascimento: dataNascimento,
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Erro ao salvar aniversariante.");
      }
    },
    onSuccess: () => {
      toast.success(editingAniversarianteId ? "Cadastro atualizado com sucesso!" : "Aniversariante cadastrado com sucesso!");
      cancelEditAniversariante();
      queryClient.invalidateQueries({ queryKey: ["aniversariantes_all"] });
      queryClient.invalidateQueries({ queryKey: ["aniversariantes"] }); // Invalida os dados do widget também
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Excluir Aniversariante
  const deleteAniversariante = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/Aniversariantes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Erro ao excluir aniversariante.");
      }
    },
    onSuccess: () => {
      toast.success("Cadastro excluído com sucesso!");
      if (editingAniversarianteId === aniversarianteToDeleteId) {
        cancelEditAniversariante();
      }
      setAniversarianteToDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["aniversariantes_all"] });
      queryClient.invalidateQueries({ queryKey: ["aniversariantes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });


  // --- Funções Auxiliares ---

  const handleEditNoticia = (n: any) => {
    setEditingPostId(n.Id || n.id);
    setTituloNoticia(n.Titulo || n.titulo);
    setResumoNoticia(n.Resumo || n.resumo);
    setImagemNoticia(n.Imagem || n.imagem || "");
    setAnexosNoticia(n.Anexos || n.anexos || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteRequest = (id: string) => {
    setPostToDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setTituloNoticia("");
    setResumoNoticia("");
    setImagemNoticia("");
    setAnexosNoticia([]);
  };

  const handleEditAniversariante = (a: AniversarianteAdmin) => {
    setEditingAniversarianteId(a.Id);
    setNomeFuncionario(a.Funcionario);
    setSetorFuncionario(a.Setor);
    setDataNascimento(a.DataNascimento);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditAniversariante = () => {
    setEditingAniversarianteId(null);
    setNomeFuncionario("");
    setSetorFuncionario("");
    setDataNascimento("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagemNoticia(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddAnexos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnexosNoticia(prev => [...prev, { nome: file.name, conteudo: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ''; // Reset do input
  };

  const removeAnexo = (index: number) => {
    setAnexosNoticia(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteAniversarianteRequest = (id: number) => {
    setAniversarianteToDeleteId(id);
    setShowDeleteAniversarianteConfirm(true);
  };

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

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const handleSendWhatsApp = async () => {
    setIsSendingWhatsApp(true);
    const todayStr = new Date().toLocaleDateString('pt-BR');

    try {
      for (const [nomeRestaurante, listaPedidos] of Object.entries(pedidosAgrupados) as [string, any[]][]) {
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text(`Relatorio de Pedidos - ${nomeRestaurante}`, 14, 15);

        let yPos = 25;
        doc.setFontSize(14);
        doc.setTextColor(234, 88, 12);
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
          headStyles: { fillColor: [30, 41, 59] },
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

        const safeName = nomeRestaurante.replace(/[^a-z0-9]/gi, '_');
        const fileName = `Pedidos_${safeName}_${todayStr.replace(/\//g, '-')}.pdf`;
        const blob = doc.output('blob');

        const formData = new FormData();
        formData.append('pdf', blob, fileName);
        formData.append('restaurante', nomeRestaurante);
        formData.append('data', todayStr);

        const response = await fetch(`${API_BASE_URL}/api/EnviarWhatsApp`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Erro ao enviar via WhatsApp');
        }
      }

      toast.success('Pedidos enviados via WhatsApp com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar via WhatsApp');
    } finally {
      setIsSendingWhatsApp(false);
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

  const aniversariantesFiltrados = aniversariantes.filter((a: AniversarianteAdmin) => {
    const termo = buscaAniversariante.toLowerCase();
    return a.Funcionario.toLowerCase().includes(termo) || a.Setor.toLowerCase().includes(termo);
  });

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
        {!["RECEPCAO", "RECEPÇÃO"].includes(loggedAdmin.department.toUpperCase()) && (
          <button
            onClick={() => setActiveTab("aniversariantes")}
            className={`flex-1 min-w-[150px] py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === "aniversariantes" ? "bg-orange text-white shadow-md" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Cake className="h-4 w-4" /> Cadastrar Aniversariantes
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="gap-2 border-orange text-orange hover:bg-orange hover:text-white transition-colors">
                    <Download className="h-4 w-4" /> Gerar PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSendWhatsApp} disabled={isSendingWhatsApp} className="gap-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    {isSendingWhatsApp ? "Enviando..." : "Enviar via WhatsApp"}
                  </Button>
                </div>
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
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-5 card-shadow space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="h-5 w-5 text-orange" />
              <h2 className="text-lg font-bold">{editingPostId ? "Editar Notícia" : "Publicar Nova Notícia"}</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Título da Notícia</label>
                <input type="text" value={tituloNoticia} onChange={e => setTituloNoticia(e.target.value)} className={inputClass} placeholder="Digite o título principal..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Resumo / Conteúdo Breve</label>
                <div className="bg-card rounded-lg border border-input quill-container">
                  <ReactQuill theme="snow" value={resumoNoticia} onChange={setResumoNoticia} placeholder="Digite o conteúdo da notícia..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Imagem de Capa</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className={`${inputClass} p-1.5 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange/10 file:text-orange hover:file:bg-orange/20`} />
                {imagemNoticia && (
                  <div className="mt-3 relative w-full max-w-sm h-48 rounded-lg overflow-hidden border border-border">
                    <img src={imagemNoticia} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => setImagemNoticia("")} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase flex items-center gap-1 mb-1.5">
                  <Paperclip className="h-3.5 w-3.5" /> Arquivos Anexos (Opcional)
                </label>
                <input type="file" multiple onChange={handleAddAnexos} className={`${inputClass} p-1.5 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange/10 file:text-orange hover:file:bg-orange/20`} />
                {anexosNoticia.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {anexosNoticia.map((anexo, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-secondary text-xs px-2.5 py-1.5 rounded-md border border-border">
                        <span className="truncate max-w-[200px]">{anexo.nome}</span>
                        <button onClick={() => removeAnexo(idx)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                {editingPostId && (
                  <Button variant="outline" className="w-full" onClick={cancelEdit}>Cancelar Edição</Button>
                )}
                <Button variant="accent" className="w-full" onClick={() => saveNoticia.mutate()} disabled={saveNoticia.isPending}>
                  {saveNoticia.isPending ? "Salvando..." : (editingPostId ? "Atualizar Notícia" : "Publicar Notícia")}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 card-shadow space-y-4">
            <h2 className="text-lg font-bold">Notícias Publicadas</h2>
            <div className="space-y-3">
              {noticias.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma notícia encontrada.</p>
              ) : (
                noticias.map((n: any) => (
                  <div key={n.Id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-secondary/50 p-3 rounded-lg border border-border gap-3">
                    <div className="flex items-center gap-3">
                      {n.Imagem && <img src={n.Imagem.startsWith('http') ? n.Imagem : `${API_BASE_URL}${n.Imagem}`} alt={n.Titulo} className="w-12 h-12 rounded object-cover" />}
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-1">{n.Titulo}</h4>
                        <p className="text-xs text-muted-foreground">{n.DataPublicacao} - {n.Autor}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleEditNoticia(n)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(n.Id)}>Excluir</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO: ANIVERSARIANTES */}
      {activeTab === "aniversariantes" && !["RECEPCAO", "RECEPÇÃO"].includes(loggedAdmin.department.toUpperCase()) && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-5 card-shadow space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Cake className="h-5 w-5 text-orange" />
              <h2 className="text-lg font-bold">{editingAniversarianteId ? "Editar Cadastro" : "Cadastrar Novo Aniversariante"}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Nome do Funcionário</label>
                <input type="text" value={nomeFuncionario} onChange={e => setNomeFuncionario(e.target.value)} className={inputClass} placeholder="Nome completo..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Setor</label>
                <input type="text" value={setorFuncionario} onChange={e => setSetorFuncionario(e.target.value)} className={inputClass} placeholder="Setor do funcionário..." />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase block mb-1.5">Data de Nascimento</label>
                <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              {editingAniversarianteId && (
                <Button variant="outline" className="w-full" onClick={cancelEditAniversariante}>Cancelar Edição</Button>
              )}
              <Button variant="accent" className="w-full" onClick={() => saveAniversariante.mutate()} disabled={saveAniversariante.isPending}>
                {saveAniversariante.isPending ? "Salvando..." : (editingAniversarianteId ? "Atualizar Cadastro" : "Salvar Cadastro")}
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 card-shadow space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold">Aniversariantes Cadastrados</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou setor..."
                  value={buscaAniversariante}
                  onChange={(e) => setBuscaAniversariante(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:border-orange focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="space-y-3">
              {loadingAniversariantes ? (
                <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-orange" /></div>
              ) : aniversariantesFiltrados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aniversariante encontrado.</p>
              ) : (
                aniversariantesFiltrados.map((a: AniversarianteAdmin) => (
                  <div key={a.Id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-secondary/50 p-3 rounded-lg border border-border gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center text-orange">
                        <Cake className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-1">{a.Funcionario}</h4>
                        {/* Tratamento 'T12:00:00' garante que o fuso horário não atrase um dia da data de nascimento */}
                        <p className="text-xs text-muted-foreground">{a.Setor} - {new Date(a.DataNascimento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleEditAniversariante(a)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteAniversarianteRequest(a.Id)}>Excluir</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Notícia */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Info className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-base text-foreground mt-4 leading-relaxed">
              Tem certeza que deseja excluir esta notícia?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (postToDeleteId) deleteNoticia.mutate(postToDeleteId); setShowDeleteConfirm(false); }} disabled={deleteNoticia.isPending}>
              {deleteNoticia.isPending ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão de Aniversariante */}
      <Dialog open={showDeleteAniversarianteConfirm} onOpenChange={setShowDeleteAniversarianteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Info className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-base text-foreground mt-4 leading-relaxed">
              Tem certeza que deseja excluir este cadastro de aniversariante?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={() => setShowDeleteAniversarianteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (aniversarianteToDeleteId) deleteAniversariante.mutate(aniversarianteToDeleteId); setShowDeleteAniversarianteConfirm(false); }} disabled={deleteAniversariante.isPending}>
              {deleteAniversariante.isPending ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;