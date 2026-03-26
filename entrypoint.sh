#!/bin/sh

# Inicializa noticias.json no volume se não existir
if [ ! -f /app/data/noticias.json ]; then
    echo "Inicializando noticias.json..."
    cp /app/data_init/noticias.json /app/data/noticias.json
fi

# Copia uploads iniciais para o volume (não sobrescreve existentes)
if [ -d /app/uploads_init ]; then
    cp -n /app/uploads_init/* /app/uploads/ 2>/dev/null || true
fi

exec uvicorn main:app --host 0.0.0.0 --port 8000
