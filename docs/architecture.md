# Arquitetura do MemDeck

## Visão geral

O MemDeck separa a experiência de estudo da API e das regras de negócio, mantendo os dois projetos em um único repositório.

```text
Cliente React (frontend/)
        │ HTTP
        ▼
API Fastify (backend/)
        │ Prisma
        ▼
PostgreSQL / Neon
```

## Fronteiras

| Área | Responsabilidade |
| --- | --- |
| `frontend/` | Telas, navegação, autenticação no cliente e interação de estudo. |
| `backend/` | Endpoints, autenticação, validação, regras de decks, cards e revisões. |
| `backend/prisma/` | Modelo de dados e acesso ao banco pelo Prisma. |
| `docs/` | Decisões técnicas e documentação de arquitetura. |

## Histórico da migração

Em 30 de outubro de 2026, os históricos independentes de `camillafontenele/frontend` e `camillafontenele/backend` foram unidos sem reescrever seus commits. Os commits anteriores continuam alcançáveis em `main`; os commits de migração apenas introduzem os diretórios `frontend/` e `backend/`.
