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
    StatusPedido: str = "Pendente"

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
        mistura_val = rows[0][2].strip() if rows[0][2] else ""
        # Se o texto começar com '[', significa que foi salvo pelo React no formato JSON
        if mistura_val.startswith("["):
            restaurantes_list = json.loads(mistura_val)
        else:
            # Caso contrário, lê todas as linhas cadastradas manualmente no SQL
            for i, row_data in enumerate(rows):
                misturas = [m.strip() for m in row_data[2].split(",") if m.strip()] if row_data[2] else []
                nome_rest = row_data[3].strip() if row_data[3] else f"Restaurante {i+1}"
                acomps = [a.strip() for a in row_data[4].split(",") if a.strip()] if row_data[4] else []
                
                restaurantes_list.append({
                    "id": str(row_data[0]),
                    "nome": nome_rest,
                    "misturas": misturas,
                    "acompanhamentos": acomps,
                    "tamanhos": [{"nome": "Marmita", "preco": "0.00"}] # Padrão já que não há tabela de tamanhos
                })
    except Exception as e:
        print(f"Erro processando cardápio: {e}")
        restaurantes_list = []

    return {
        "id": rows[0][0],
        "data": rows[0][1],
        "restaurantes": restaurantes_list
    }

@app.post("/api/Cardapio")
def save_cardapio(payload: CardapioRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        restaurantes_str = json.dumps(payload.restaurantes)
        safe_date = payload.data.replace("-", "")

        cursor.execute("SELECT id FROM dbo.CARDAPIO WHERE DataCadastro = ?", (safe_date,))
        row = cursor.fetchone()

        if row:
            cursor.execute("UPDATE dbo.CARDAPIO SET Mistura = ? WHERE DataCadastro = ?", (restaurantes_str, safe_date))
        else:
            cursor.execute("INSERT INTO dbo.CARDAPIO (DataCadastro, Restaurante, Mistura, Acompanhamento) VALUES (?, ?, ?, ?)", 
                           (safe_date, "Vários", restaurantes_str, ""))
        
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

@app.post("/api/SolicitarAlmoco")
def save_pedido(payload: PedidoRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        safe_date = payload.DataCadastro.replace("-", "")

        cursor.execute("SELECT Id FROM dbo.SOLICITAR_ALMOCO WHERE CAST(DataCadastro AS DATE) = CAST(? AS DATE) AND NomeSolicitante = ?", 
                       (safe_date, payload.NomeSolicitante))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=409, detail="Você já fez pedido hoje!")

        # Captura a data e hora exata do servidor
        data_hora_atual = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO dbo.SOLICITAR_ALMOCO 
            (DataCadastro, NomeSolicitante, EmailSolicitante, SetorSolicitante, Mistura, Acompanhamento, Tamanho, Restaurante, Obs, StatusPedido)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data_hora_atual, payload.NomeSolicitante, payload.EmailSolicitante, payload.SetorSolicitante,
            payload.Mistura, payload.Acompanhamento, payload.Tamanho, payload.Restaurante, payload.Obs, payload.StatusPedido
        ))

        conn.commit()
        conn.close()
        return {"message": "Pedido inserido com sucesso"}
    except Exception as e:
        print(f"Erro de conexão/SQL (POST SolicitarAlmoco): {e}")
        raise HTTPException(status_code=500, detail=f"Erro BD: {str(e)}")