# MemDeck

MemDeck é uma aplicação de flashcards para estudo com revisão espaçada, autenticação e organização por decks.

## Tecnologias

- **Frontend:** React, Vite, TypeScript e Tailwind CSS
- **Backend:** Fastify, Prisma, PostgreSQL/Neon e JWT
- **Testes:** Vitest
- **Automação:** GitHub Actions

## Estrutura

```text
frontend/       Aplicação React e experiência do usuário
backend/        API Fastify, Prisma, autenticação e regras de negócio
docs/           Arquitetura e decisões técnicas
.github/        Workflows de integração contínua
```

## Desenvolvimento

Instale as dependências em cada aplicação:

```bash
npm install --prefix frontend
npm install --prefix backend
```

Comandos disponíveis na raiz:

```bash
npm run dev:frontend
npm run dev:backend
npm run lint
npm run test
npm run build
```

Consulte [a arquitetura](docs/architecture.md) para uma visão dos componentes do projeto.

## Produção

Crie arquivos locais a partir de [frontend/.env.example](frontend/.env.example)
e [backend/.env.example](backend/.env.example). Nunca versione arquivos `.env`
nem use variáveis `VITE_` para segredos.

Variáveis obrigatórias no backend:

- `DATABASE_URL`: string de conexão Neon/PostgreSQL com TLS;
- `JWT_SECRET`: segredo longo e aleatório;
- `CORS_ORIGIN`: origem pública do frontend, ou múltiplas origens separadas por vírgula;
- `PORT`: porta fornecida pela hospedagem.

`VITE_API_URL` deve apontar para a URL pública da API no build do frontend.
As variáveis de Google OAuth são opcionais nesta primeira publicação; configure as
três variáveis Google juntas para habilitar esse fluxo e registre a URL pública de callback no Google.

Fluxo de deploy do backend:

```bash
npm run build:backend
npm run prisma:migrate:deploy
npm run start:backend
```

`prisma:migrate:deploy` permanece um passo explícito de publicação e não é executado pelo build.

O Prisma 7 usa `backend/prisma.config.ts`, descoberto automaticamente pelos scripts
executados no backend. A configuração carrega `.env` via `dotenv`; a conexão fica
na configuração, enquanto o provider PostgreSQL permanece no schema. Para gerar
o client separadamente, execute `npm run prisma:generate` na raiz. Instale também
as dependências de desenvolvimento na etapa de build (Prisma CLI e TypeScript).
O runtime precisa das dependências de produção, incluindo `dotenv`, e de `dist`.

As cinco migrations versionadas recriam o schema atual a partir de um banco vazio.
A CI valida isso em PostgreSQL 17 isolado, aplicando `migrate deploy` e comparando
o resultado com o schema via `migrate diff --exit-code`.
Não use `db push` como substituto das migrations no deploy.

Antes de aplicar o histórico em um banco já populado, confira seu histórico de
migrations: `20260903181826_add_user` adiciona `Deck.userId` obrigatório sem valor
padrão e falha se houver decks antigos sem proprietário. Nesse cenário, planeje
o preenchimento dos dados antes do deploy; não altere migrations já aplicadas.
