# Deploy no Railway

Este projeto funciona bem no Railway com 3 servicos:

1. `frontend`
2. `backend`
3. `postgres`

## 1. Subir o repositorio

Envie o projeto para GitHub primeiro.

## 2. Criar o projeto no Railway

No Railway:

1. Clique em `New Project`
2. Escolha `Deploy from GitHub repo`
3. Selecione este repositorio

## 3. Criar o servico `backend`

No servico do backend:

1. Abra `Settings`
2. Em `Root Directory`, defina:

```text
cafeteria-backend
```

O Railway documenta que, em monorepo isolado, cada servico deve usar seu proprio `Root Directory`. Fonte: [Deploying a Monorepo | Railway Docs](https://docs.railway.com/deployments/monorepo)

O Railway tambem usa o `Dockerfile` que estiver na raiz do diretorio-fonte do servico. Fonte: [Dockerfiles | Railway Docs](https://docs.railway.com/builds/dockerfiles)

### Variaveis do backend

Defina estas variaveis no servico `backend`:

```env
PORT=3333
PERSISTENCE_DRIVER=postgres
STORE_NAME=Cafe Boutique Premium
ADMIN_EMAIL=admin@cafeboutique.com
ADMIN_PASSWORD=123456
JWT_SECRET=troque-esta-chave-em-producao
ENABLE_PRINTER=false
PRINTER_HOST=
PRINTER_PORT=9100
```

Depois que o `frontend` tiver dominio publico, adicione:

```env
FRONTEND_URL=https://SEU_FRONTEND.up.railway.app
PUBLIC_MENU_BASE_URL=https://SEU_FRONTEND.up.railway.app/#/mesa
```

## 4. Adicionar PostgreSQL

No mesmo projeto:

1. Clique em `+ New`
2. Adicione `PostgreSQL`

O Railway informa que o PostgreSQL expoe automaticamente variaveis como:

- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `DATABASE_URL`

Fonte: [PostgreSQL | Railway Docs](https://docs.railway.com/databases/postgresql)

No servico `backend`, vincule a variavel:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Se o painel nao preencher isso automaticamente, copie o `DATABASE_URL` do servico Postgres e cole no backend.

## 5. Adicionar volume para fotos

O backend salva imagens localmente em:

```text
/app/uploads
```

No Railway:

1. Crie um `Volume`
2. Conecte ao servico `backend`
3. Monte em:

```text
/app/uploads
```

O Railway documenta que, se a aplicacao grava em caminho relativo dentro de `/app`, o mount path deve incluir `/app/...`. Fonte: [Using Volumes | Railway Docs](https://docs.railway.com/volumes)

## 6. Criar o servico `frontend`

No servico do frontend:

1. Abra `Settings`
2. Em `Root Directory`, defina:

```text
frontend
```

### Variaveis do frontend

Defina:

```env
VITE_API_URL=https://SEU_BACKEND.up.railway.app
VITE_SOCKET_URL=https://SEU_BACKEND.up.railway.app
```

Como essas variaveis entram no build do Vite, depois de salvar rode um redeploy do frontend.

## 7. Gerar dominios publicos

No Railway, abra:

1. `frontend` -> `Networking` -> gere um dominio publico
2. `backend` -> `Networking` -> gere um dominio publico

Depois:

1. copie o dominio do backend para `VITE_API_URL` e `VITE_SOCKET_URL`
2. copie o dominio do frontend para `FRONTEND_URL` e `PUBLIC_MENU_BASE_URL`
3. redeploy os dois servicos

O Railway tambem oferece dominios Railway e dominios comprados pela propria plataforma. Fonte: [Railway Domains | Railway Docs](https://docs.railway.com/networking/domains/railway-domains)

## 8. Ordem recomendada

1. Suba `postgres`
2. Suba `backend`
3. Gere dominio do `backend`
4. Suba `frontend`
5. Gere dominio do `frontend`
6. Atualize variaveis cruzadas
7. Rode novo deploy de `frontend` e `backend`

## 9. Teste final

- Frontend:

```text
https://SEU_FRONTEND.up.railway.app/#/
```

- Login admin:

```text
https://SEU_FRONTEND.up.railway.app/#/login
```

- Backend health:

```text
https://SEU_BACKEND.up.railway.app/health
```

## 10. Credenciais iniciais

- email: `admin@cafeboutique.com`
- senha: `123456`

Troque isso antes de uso real.
