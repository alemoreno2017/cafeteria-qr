# Cafeteria QR Backend

Backend Node.js + Express para o sistema de pedidos via QR Code.

## Recursos

- Cardapio digital por mesa
- Login administrativo
- Atualizacao em tempo real via Socket.io
- Cadastro de mesas com QR Code
- Criacao e atualizacao de pedidos
- Painel da cozinha, caixa e TV
- Driver em memoria e modo preparado para PostgreSQL
- Docker e VPS Linux

## Endpoints principais

- `POST /api/auth/login`
- `GET /health`
- `GET /api/menu`
- `GET /api/tables`
- `GET /api/tables/:tableId/qrcode`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:orderId/status`
- `GET /api/dashboard`
- `GET /api/reports/summary`

## Login padrao

- Email: `admin@cafeboutique.com`
- Senha: `123456`

Troque isso em producao pelas variaveis `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `JWT_SECRET`.

## Execucao local

```bash
npm install
npm run dev
```

## Persistencia

- `PERSISTENCE_DRIVER=memory`: usa dados demo em memoria.
- `PERSISTENCE_DRIVER=postgres`: cria schema, semeia dados iniciais e persiste pedidos no PostgreSQL.

## Deploy com Docker

Use o arquivo `docker-compose.cafeteria.yml` na raiz do workspace para subir:

- `frontend` em `4173`
- `backend` em `3333`
- `postgres` em `5432`
