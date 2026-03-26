# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments – configure em Coolify > Build Arguments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

# Expõe como variáveis de ambiente para o Vite durante o build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Copia manifests e instala dependências (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copia o restante do código e faz o build
COPY . .
RUN npm run build

# ─── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Config customizado para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copia os arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
