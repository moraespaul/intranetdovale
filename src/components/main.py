from fastapi import FastAPI, HTTPException, status, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Any
import pyodbc
import json
import datetime
import os
import uuid
import base64
import tempfile
import os
import requests as http_requests

app = FastAPI(title="API Intranet Dovale - Almoço")

# Configuração de CORS para permitir que o React converse com esta API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === DIRETÓRIO DE UPLOADS E ARQUIVO LOCAL ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

NEWS_FILE = os.path.join(BASE_DIR, "noticias.json")

# Permite que o frontend acesse a pasta /uploads via URL (ex: /uploads/imagem.png)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# === DADOS DE CONEXÃO COM O SQL SERVER ===
# Substitua com os dados reais do seu banco
WHATSAPP_TOKEN = "EAA9L0ZBKhUj0BQvpSsI3YoZBZB7sedh8P9PXOcwqz21qKcUrK9NpUPNJQ82JtXKqXSa62fGTwnRrCnNRYDOBV5l7YjZC9mXMj1hZBn3ktFnfBZB5wBkLFWleNGnkrIJuHiLUMhks6ZA5EEd0PXGxfJy0k25CQMSX8BPoDnIbCea00PDteAot9mC023bpmnWUwZDZD"           # Token de acesso permanente do Meta
WHATSAPP_PHONE_NUMBER_ID = "880579608482362"  
WHATSAPP_DESTINATARIOS = {
    "Restaurante Sabores do Tiao": "5512981898755",
    "Restaurante Moria": "5512988467809",
    "DEMOCRATAS": "5512981898755",
    "SABOR DO AMOR": "5512988467809",
}

SERVER = '192.168.10.13'
DATABASE = 'SOLICITAR_ALMOCO'
USERNAME = 'sa'
PASSWORD = 'Elavod@2018@'

# --- Detecção Automática do Driver ODBC ---
installed_drivers = pyodbc.drivers()
if 'ODBC Driver 17 for SQL Server' in installed_drivers:
    SQL_DRIVER = '{ODBC Driver 17 for SQL Server}'
elif 'ODBC Driver 18 for SQL Server' in installed_drivers:
    SQL_DRIVER = '{ODBC Driver 18 for SQL Server}'
elif 'SQL Server Native Client 11.0' in installed_drivers:
    SQL_DRIVER = '{SQL Server Native Client 11.0}'
else:
    SQL_DRIVER = '{SQL Server Native Client 11.0}' # Fallback de segurança

connection_string = f"DRIVER={SQL_DRIVER};SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD};TrustServerCertificate=yes;Encrypt=no;"

def get_db_connection():
    return pyodbc.connect(connection_string)

# Conexão específica para o banco da INTRANET
INTRANET_DB = 'INTRANET'
intranet_connection_string = f"DRIVER={SQL_DRIVER};SERVER={SERVER};DATABASE={INTRANET_DB};UID={USERNAME};PWD={PASSWORD};TrustServerCertificate=yes;Encrypt=no;"
def get_intranet_db_connection():
    return pyodbc.connect(intranet_connection_string)

# === MODELOS DE DADOS (Pydantic) ===
class CardapioRequest(BaseModel):
    data: str
    restaurantes: List[Any]

class PedidoRequest(BaseModel):
    DataCadastro: str
    NomeSolicitante: str
    EmailSolicitante: Optional[str] = None
    SetorSolicitante: Optional[str] = None
    Mistura: str
    Acompanhamento: Optional[str] = None
    Tamanho: str
    Restaurante: str
    Obs: Optional[str] = None
    StatusPedido: str = "Aberto"
    force: bool = False

class NoticiaRequest(BaseModel):
    titulo: str
    resumo: str
    autor: str
    imagem: str
    data_publicacao: Optional[str] = None
    anexos: Optional[List[Any]] = None

class AniversarianteRequest(BaseModel):
    Funcionario: str
    Setor: str
    DataNascimento: str # YYYY-MM-DD

# === ROTAS ===
@app.get("/api/Cardapio")
def get_cardapio(data: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Formata para YYYYMMDD para o SQL Server não confundir o mês com o dia
        safe_date = data.replace("-", "")
        cursor.execute("SELECT id, DataCadastro, Mistura, Restaurante, Acompanhamento FROM dbo.CARDAPIO WHERE CAST(DataCadastro AS DATE) = CAST(? AS DATE)", (safe_date,))
        rows = cursor.fetchall()
        conn.close()
    except Exception as e:
        print(f"Erro de conexão/SQL (GET Cardapio): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")

    if not rows:
        raise HTTPException(status_code=404, detail="Cardápio não encontrado")
    
    restaurantes_list = []
    try:
        # Lê todas as linhas separadas do SQL e remonta o formato esperado pelo React
        for i, row_data in enumerate(rows):
            mistura_val = row_data[2].strip() if row_data[2] else ""
            acomps_val = row_data[4].strip() if row_data[4] else ""
            
            nome_db = row_data[3].strip() if row_data[3] else f"Restaurante {i+1}"
            misturas = [m.strip() for m in mistura_val.split(",") if m.strip()] if mistura_val else []
            acomps = [a.strip() for a in acomps_val.split(",") if a.strip()] if acomps_val else []
            
            tamanhos_list = []
            # Extrai os tamanhos que foram "escondidos" na coluna de restaurante pelo React
            if "||" in nome_db:
                nome_rest, tamanhos_str = nome_db.split("||", 1)
                for t_str in tamanhos_str.split(";"):
                    if ":" in t_str:
                        t_nome, t_preco = t_str.split(":", 1)
                        tamanhos_list.append({"nome": t_nome.strip(), "preco": t_preco.strip()})
            else:
                nome_rest = nome_db

            restaurantes_list.append({
                "id": str(row_data[0]),
                "nome": nome_rest,
                "misturas": misturas,
                "acompanhamentos": acomps,
                "tamanhos": tamanhos_list
            })
    except Exception as e:
        print(f"Erro processando cardápio: {e}")
        restaurantes_list = []

    return {
        "id": rows[0][0],
        # Garante que a data enviada ao React seja um texto (ex: '2023-10-25') e não um objeto Date do Python
        "data": str(rows[0][1]) if rows[0][1] else data,
        "restaurantes": restaurantes_list
    }

@app.get("/api/Aniversariantes")
def get_aniversariantes():
    try:
        conn = get_intranet_db_connection()
        cursor = conn.cursor()
        # Busca apenas os aniversariantes do mês atual e ordena pelo dia
        cursor.execute("""
            SELECT Id, Funcionario, Setor, DataNascimento 
            FROM dbo.ANIVERSARIANTES
            WHERE MONTH(DataNascimento) = MONTH(GETDATE())
            ORDER BY DAY(DataNascimento), Funcionario
        """)
        
        aniversariantes = []
        for row in cursor.fetchall():
            data_nasc = row[3]
            aniversariantes.append({
                "id": str(row[0]),
                "nome": row[1].strip() if row[1] else "Sem Nome",
                "depto": row[2].strip() if row[2] else "Geral",
                "data": data_nasc.strftime("%d/%m") if data_nasc else "",
                "dia": data_nasc.day if data_nasc else 0
            })
        conn.close()
        return aniversariantes
    except Exception as e:
        print(f"Erro de conexão/SQL (GET Aniversariantes): {e}")
        return []

@app.get("/api/Aniversariantes/all")
def get_all_aniversariantes():
    try:
        conn = get_intranet_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT Id, Funcionario, Setor, DataNascimento 
            FROM dbo.ANIVERSARIANTES
            ORDER BY Funcionario
        """)
        
        aniversariantes = []
        for row in cursor.fetchall():
            data_nasc = row[3]
            aniversariantes.append({
                "Id": row[0],
                "Funcionario": row[1].strip() if row[1] else "Sem Nome",
                "Setor": row[2].strip() if row[2] else "Geral",
                "DataNascimento": data_nasc.strftime("%Y-%m-%d") if data_nasc else "",
            })
        conn.close()
        return aniversariantes
    except Exception as e:
        print(f"Erro de conexão/SQL (GET Aniversariantes/all): {e}")
        return []

@app.post("/api/Cardapio")
def save_cardapio(payload: CardapioRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        safe_date = payload.data.replace("-", "")

        # Exclui o cardápio antigo da data para inserir os restaurantes separadamente
        cursor.execute("DELETE FROM dbo.CARDAPIO WHERE CAST(DataCadastro AS DATE) = CAST(? AS DATE)", (safe_date,))
        
        # Separa o JSON do React e salva nas colunas corretas (Restaurante, Mistura, Acompanhamento)
        for rest in payload.restaurantes:
            # "Esconde" os tamanhos dentro da string de restaurante para salvar no SQL sem precisar de nova coluna
            nome_rest_base = str(rest.get("nome", "Restaurante")).replace("||", "")
            tamanhos = rest.get("tamanhos", [])
            tamanhos_str = ";".join([f"{t.get('nome', '')}:{t.get('preco', '')}" for t in tamanhos])
            
            if tamanhos_str:
                nome_rest = f"{nome_rest_base}||{tamanhos_str}"[:200]
            else:
                nome_rest = nome_rest_base[:200]
                
            misturas_str = ", ".join(rest.get("misturas", []))[:1000]
            acomps_str = ", ".join(rest.get("acompanhamentos", []))[:1000]
            
            cursor.execute("""
                INSERT INTO dbo.CARDAPIO (DataCadastro, Restaurante, Mistura, Acompanhamento) 
                VALUES (?, ?, ?, ?)
            """, (safe_date, nome_rest, misturas_str, acomps_str))
        
        conn.commit()
        conn.close()
        return {"message": "Cardápio salvo com sucesso"}
    except Exception as e:
        print(f"Erro de conexão/SQL (POST Cardapio): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")

@app.get("/api/SolicitarAlmoco")
def get_pedidos(data: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        safe_date = data.replace("-", "")
        cursor.execute("""
            SELECT Id, DataCadastro, NomeSolicitante, EmailSolicitante, SetorSolicitante, 
                   Mistura, Acompanhamento, Tamanho, Restaurante, Obs, StatusPedido 
            FROM dbo.SOLICITAR_ALMOCO 
            WHERE CAST(DataCadastro AS DATE) = CAST(? AS DATE)
        """, (safe_date,))
        
        columns = [column[0] for column in cursor.description]
        pedidos = []
        for row in cursor.fetchall():
            pedido_dict = dict(zip(columns, row))
            if pedido_dict.get('DataCadastro'):
                # Garante que a data seja enviada no formato ISO para o React ler com sucesso
                if isinstance(pedido_dict['DataCadastro'], datetime.datetime):
                    pedido_dict['DataCadastro'] = pedido_dict['DataCadastro'].isoformat()
                else:
                    pedido_dict['DataCadastro'] = str(pedido_dict['DataCadastro'])
            pedidos.append(pedido_dict)
        conn.close()
        return pedidos
    except Exception as e:
        print(f"Erro de conexão/SQL (GET SolicitarAlmoco): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")

@app.get("/api/HistoricoPedidos")
def get_historico_pedidos(usuario: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT Id, DataCadastro, NomeSolicitante, EmailSolicitante, SetorSolicitante, 
                   Mistura, Acompanhamento, Tamanho, Restaurante, Obs, StatusPedido 
            FROM dbo.SOLICITAR_ALMOCO 
            WHERE NomeSolicitante = ?
            ORDER BY DataCadastro DESC
        """, (usuario,))
        
        columns = [column[0] for column in cursor.description]
        pedidos = []
        for row in cursor.fetchall():
            pedido_dict = dict(zip(columns, row))
            if pedido_dict.get('DataCadastro'):
                if isinstance(pedido_dict['DataCadastro'], datetime.datetime):
                    pedido_dict['DataCadastro'] = pedido_dict['DataCadastro'].isoformat()
                else:
                    pedido_dict['DataCadastro'] = str(pedido_dict['DataCadastro'])
            pedidos.append(pedido_dict)
        conn.close()
        return pedidos
    except Exception as e:
        print(f"Erro de conexão/SQL (GET HistoricoPedidos): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")

@app.post("/api/SolicitarAlmoco")
def save_pedido(payload: PedidoRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        safe_date = payload.DataCadastro.replace("-", "")

        if not payload.force:
            cursor.execute("SELECT Id FROM dbo.SOLICITAR_ALMOCO WHERE CAST(DataCadastro AS DATE) = CAST(? AS DATE) AND NomeSolicitante = ?", 
                           (safe_date, payload.NomeSolicitante))
            if cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=409, detail="Você já fez pedido hoje!")

        # Captura a data e hora exata do servidor
        # Formato universal contínuo do SQL Server (YYYYMMDD HH:MM:SS) para evitar erros de idioma
        data_hora_atual = datetime.datetime.now().strftime("%Y%m%d %H:%M:%S")

        # Prevenção rigorosa: Substitui Nulos por textos vazios ("") e limita o tamanho 
        # para garantir que o SQL Server não bloqueie a inserção (Erro de NOT NULL ou Truncation)
        p_nome = str(payload.NomeSolicitante or "")[:200]
        p_email = str(payload.EmailSolicitante or "")[:200]
        p_setor = str(payload.SetorSolicitante or "")[:100]
        p_mistura = str(payload.Mistura or "")[:1000]
        p_acomp = str(payload.Acompanhamento or "")[:1000]
        p_tamanho = str(payload.Tamanho or "")[:100]
        p_rest = str(payload.Restaurante or "")[:200]
        p_obs = str(payload.Obs or "")[:1000]
        p_status = str(payload.StatusPedido or "Aberto")[:50]

        cursor.execute("""
            INSERT INTO dbo.SOLICITAR_ALMOCO 
            (DataCadastro, NomeSolicitante, EmailSolicitante, SetorSolicitante, Mistura, Acompanhamento, Tamanho, Restaurante, Obs, StatusPedido)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data_hora_atual, p_nome, p_email, p_setor,
            p_mistura, p_acomp, p_tamanho, p_rest, p_obs, p_status
        ))

        conn.commit()
        conn.close()
        return {"message": "Pedido inserido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro de conexão/SQL (POST SolicitarAlmoco): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")

@app.get("/api/Noticias")
def get_noticias():
    try:
        if not os.path.exists(NEWS_FILE):
            return []
        
        with open(NEWS_FILE, "r", encoding="utf-8") as f:
            noticias = json.load(f)
            
        # Retorna a lista invertida para que a postagem mais recente seja a primeira a aparecer
        return noticias[::-1]
    except Exception as e:
        print(f"Erro ao ler arquivo de notícias local: {e}")
        return []

@app.post("/api/Noticias")
def save_noticia(payload: NoticiaRequest):
    try:
        # Formata a data para aparecer perfeitamente no site (Ex: 25/10/2023)
        data_hora_atual = datetime.datetime.now().strftime("%d/%m/%Y")
        
        caminho_imagem = ""
        if payload.imagem:
            # Verifica se a imagem veio em Base64 do React
            if payload.imagem.startswith("data:image"):
                # Separa o cabeçalho (data:image/png;base64) do conteúdo real
                header, encoded = payload.imagem.split(",", 1)
                ext = header.split("/")[1].split(";")[0]
                
                # Gera um nome único para o arquivo para evitar conflito (ex: a1b2c3d4.png)
                nome_arquivo = f"{uuid.uuid4().hex}.{ext}"
                caminho_fisico = os.path.join(UPLOAD_DIR, nome_arquivo)
                
                # Decodifica e salva o arquivo fisicamente na pasta "uploads"
                with open(caminho_fisico, "wb") as f:
                    f.write(base64.b64decode(encoded))
                
                # Salva no banco APENAS o link do arquivo para o banco ficar leve
                caminho_imagem = f"/uploads/{nome_arquivo}"
            else:
                caminho_imagem = payload.imagem
                
        # Processa e salva os arquivos em anexo
        anexos_salvos = []
        if payload.anexos:
            for anexo in payload.anexos:
                conteudo = anexo.get("conteudo", "")
                if conteudo.startswith("data:"):
                    header, encoded = conteudo.split(",", 1)
                    safe_nome = anexo.get("nome", "anexo").replace("/", "_").replace("\\", "_")
                    nome_arquivo = f"{uuid.uuid4().hex}_{safe_nome}"
                    caminho_fisico = os.path.join(UPLOAD_DIR, nome_arquivo)
                    with open(caminho_fisico, "wb") as f:
                        f.write(base64.b64decode(encoded))
                    anexos_salvos.append({"nome": safe_nome, "url": f"/uploads/{nome_arquivo}"})
                else:
                    anexos_salvos.append(anexo)

        # Lê as notícias antigas se o arquivo existir
        noticias = []
        if os.path.exists(NEWS_FILE):
            with open(NEWS_FILE, "r", encoding="utf-8") as f:
                try:
                    noticias = json.load(f)
                except json.JSONDecodeError:
                    noticias = []
                    
        # Cria o objeto exato da nova notícia que o React precisa
        nova_noticia = {
            "Id": str(uuid.uuid4()), # Gera um ID único para o React
            "Titulo": payload.titulo,
            "Resumo": payload.resumo,
            "Autor": payload.autor,
            "DataPublicacao": data_hora_atual,
            "Imagem": caminho_imagem,
            "Anexos": anexos_salvos
        }
        
        # Adiciona na lista e subscreve o arquivo
        noticias.append(nova_noticia)
        with open(NEWS_FILE, "w", encoding="utf-8") as f:
            json.dump(noticias, f, ensure_ascii=False, indent=4)
            
        return {"message": "Notícia salva com sucesso (Local)"}
    except Exception as e:
        print(f"Erro ao salvar notícia local: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")

@app.put("/api/Noticias/{noticia_id}")
def update_noticia(noticia_id: str, payload: NoticiaRequest):
    try:
        if not os.path.exists(NEWS_FILE):
            raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
        
        with open(NEWS_FILE, "r", encoding="utf-8") as f:
            noticias = json.load(f)
            
        for noticia in noticias:
            if str(noticia.get("Id")) == noticia_id:
                noticia["Titulo"] = payload.titulo
                noticia["Resumo"] = payload.resumo
                # Atualiza imagem se for um novo Base64
                if payload.imagem and payload.imagem.startswith("data:image"):
                    header, encoded = payload.imagem.split(",", 1)
                    ext = header.split("/")[1].split(";")[0]
                    nome_arquivo = f"{uuid.uuid4().hex}.{ext}"
                    caminho_fisico = os.path.join(UPLOAD_DIR, nome_arquivo)
                    with open(caminho_fisico, "wb") as f:
                        f.write(base64.b64decode(encoded))
                    noticia["Imagem"] = f"/uploads/{nome_arquivo}"
                elif payload.imagem:
                    noticia["Imagem"] = payload.imagem
                
                anexos_salvos = []
                if payload.anexos:
                    for anexo in payload.anexos:
                        conteudo = anexo.get("conteudo", "")
                        if conteudo.startswith("data:"):
                            header, encoded = conteudo.split(",", 1)
                            safe_nome = anexo.get("nome", "anexo").replace("/", "_").replace("\\", "_")
                            nome_arquivo = f"{uuid.uuid4().hex}_{safe_nome}"
                            caminho_fisico = os.path.join(UPLOAD_DIR, nome_arquivo)
                            with open(caminho_fisico, "wb") as f:
                                f.write(base64.b64decode(encoded))
                            anexos_salvos.append({"nome": safe_nome, "url": f"/uploads/{nome_arquivo}"})
                        else:
                            anexos_salvos.append(anexo)
                noticia["Anexos"] = anexos_salvos

                with open(NEWS_FILE, "w", encoding="utf-8") as f:
                    json.dump(noticias, f, ensure_ascii=False, indent=4)
                return {"message": "Notícia atualizada com sucesso"}
        
        raise HTTPException(status_code=404, detail="Notícia não encontrada.")
    except Exception as e:
        print(f"Erro ao atualizar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/Noticias/{noticia_id}")
def delete_noticia(noticia_id: str):
    try:
        if not os.path.exists(NEWS_FILE):
            return {"message": "Arquivo não existe."}
        with open(NEWS_FILE, "r", encoding="utf-8") as f:
            noticias = json.load(f)
        noticias_filtradas = [n for n in noticias if str(n.get("Id")) != noticia_id]
        with open(NEWS_FILE, "w", encoding="utf-8") as f:
            json.dump(noticias_filtradas, f, ensure_ascii=False, indent=4)
        return {"message": "Excluído com sucesso"}
    except Exception as e:
        print(f"Erro ao excluir: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/Aniversariantes")
def create_aniversariante(payload: AniversarianteRequest):
    try:
        conn = get_intranet_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO dbo.ANIVERSARIANTES (Funcionario, Setor, DataNascimento)
            VALUES (?, ?, ?)
        """, (payload.Funcionario, payload.Setor, payload.DataNascimento))
        conn.commit()
        conn.close()
        return {"message": "Aniversariante cadastrado com sucesso!"}
    except Exception as e:
        print(f"Erro de conexão/SQL (POST Aniversariantes): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")

@app.put("/api/Aniversariantes/{aniversariante_id}")
def update_aniversariante(aniversariante_id: int, payload: AniversarianteRequest):
    try:
        conn = get_intranet_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dbo.ANIVERSARIANTES
            SET Funcionario = ?, Setor = ?, DataNascimento = ?
            WHERE Id = ?
        """, (payload.Funcionario, payload.Setor, payload.DataNascimento, aniversariante_id))
        conn.commit()
        conn.close()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Aniversariante não encontrado.")
        return {"message": "Aniversariante atualizado com sucesso!"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro de conexão/SQL (PUT Aniversariantes): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")

@app.delete("/api/Aniversariantes/{aniversariante_id}")
def delete_aniversariante(aniversariante_id: int):
    try:
        conn = get_intranet_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dbo.ANIVERSARIANTES WHERE Id = ?", (aniversariante_id,))
        conn.commit()
        conn.close()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Aniversariante não encontrado.")
        return {"message": "Aniversariante excluído com sucesso!"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro de conexão/SQL (DELETE Aniversariantes): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")

@app.get("/api/WhatsAppRestaurantes")
def get_whatsapp_restaurantes():
    return {"restaurantes": list(WHATSAPP_DESTINATARIOS.keys())}

@app.post("/api/EnviarWhatsApp")
async def enviar_whatsapp_pdf(
    pdf: UploadFile = File(...),
    restaurante: str = Form(...),
    data: str = Form(...)
):
    """
    Recebe o PDF gerado pelo frontend, faz upload na Meta e envia
    via WhatsApp usando o template 'marmitaria' (Utilidade).
    """
    try:
        destinatario = WHATSAPP_DESTINATARIOS.get(restaurante)
        if not destinatario:
            raise HTTPException(status_code=400, detail=f"Número de WhatsApp não configurado para o restaurante '{restaurante}'. Adicione-o em WHATSAPP_DESTINATARIOS no main.py.")

        pdf_content = await pdf.read()

        # Salva o PDF em arquivo temporário para fazer o upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(pdf_content)
            tmp_path = tmp.name

        try:
            # 1. Upload do PDF para a Meta (WhatsApp Media API)
            with open(tmp_path, "rb") as f:
                upload_resp = http_requests.post(
                    f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/media",
                    headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
                    files={"file": (pdf.filename, f, "application/pdf")},
                    data={"messaging_product": "whatsapp", "type": "application/pdf"}
                )

            if not upload_resp.ok:
                print(f"Erro upload Meta: {upload_resp.text}")
                raise HTTPException(status_code=500, detail=f"Erro ao fazer upload do PDF na Meta: {upload_resp.text}")

            media_id = upload_resp.json().get("id")
            if not media_id:
                raise HTTPException(status_code=500, detail="Meta não retornou o media_id do PDF")

            # 2. Envia mensagem usando o template 'marmitaria' (sem variáveis no body)
            msg_resp = http_requests.post(
                f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages",
                headers={
                    "Authorization": f"Bearer {WHATSAPP_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": destinatario,
                    "type": "template",
                    "template": {
                        "name": "marmitaria",
                        "language": {"code": "pt_BR"},
                        "components": [
                            {
                                "type": "header",
                                "parameters": [
                                    {
                                        "type": "document",
                                        "document": {
                                            "id": media_id,
                                            "filename": f"Pedidos_{restaurante}_{data}.pdf"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            )

            if not msg_resp.ok:
                print(f"Erro envio WhatsApp: {msg_resp.text}")
                raise HTTPException(status_code=500, detail=f"Erro ao enviar mensagem WhatsApp: {msg_resp.text}")

            return {"message": f"Pedidos de '{restaurante}' enviados via WhatsApp com sucesso!"}

        finally:
            os.unlink(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro (EnviarWhatsApp): {e}")
        raise HTTPException(status_code=500, detail=str(e))
