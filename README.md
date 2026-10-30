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
