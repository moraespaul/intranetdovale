from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import pyodbc
import json
import datetime

app = FastAPI(title="API Intranet Dovale - Almoço")

# Configuração de CORS para permitir que o React converse com esta API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, coloque o IP do seu React ex: ["http://192.168.0.x"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# === DADOS DE CONEXÃO COM O SQL SERVER ===
# Substitua com os dados reais do seu banco
SERVER = '192.168.10.13'
DATABASE = 'SOLICITAR_ALMOCO'
USERNAME = 'sa'
PASSWORD = 'Elavod@2018@'

connection_string = f"DRIVER={{SQL Server Native Client 11.0}};SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD}"

def get_db_connection():
    return pyodbc.connect(connection_string)

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

# === ROTAS ===
@app.get("/api/Cardapio")
def get_cardapio(data: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Formata para YYYYMMDD para o SQL Server não confundir o mês com o dia
        safe_date = data.replace("-", "")
        cursor.execute("SELECT id, DataCadastro, Mistura, Restaurante, Acompanhamento FROM dbo.CARDAPIO WHERE DataCadastro = ?", (safe_date,))
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
        raise # Garante que os erros HTTP controlados (como o 409) cheguem ao React
    except Exception as e:
        print(f"Erro de conexão/SQL (POST SolicitarAlmoco): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")