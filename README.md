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
