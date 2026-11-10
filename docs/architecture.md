# Arquitetura do MemDeck

## 1. Visão geral

O MemDeck é uma plataforma de estudos baseada em flashcards e revisão espaçada.

A arquitetura atual foi projetada para manter o produto simples durante a fase inicial, mas permitir sua evolução para novos clientes e funcionalidades sem exigir uma reescrita completa do sistema.

Atualmente o sistema é composto por uma aplicação web React e uma API Fastify organizada como um monólito modular.

```text
┌──────────────────────────┐
│      MemDeck Web         │
│ React + Vite + TypeScript│
└────────────┬─────────────┘
             │
             │ HTTP / JSON
             │ JWT
             ▼
┌──────────────────────────┐
│       MemDeck API        │
│ Fastify + TypeScript     │
│                          │
│ ┌──────────────────────┐ │
│ │ Auth                 │ │
│ │ Decks                │ │
│ │ Cards                │ │
│ │ Reviews / SRS        │ │
│ └──────────────────────┘ │
└────────────┬─────────────┘
             │
             │ Prisma
             ▼
┌──────────────────────────┐
│ PostgreSQL / Neon        │
└──────────────────────────┘
```

A API é a fonte de verdade das regras de negócio. Os clientes são responsáveis pela experiência de usuário e comunicação com a API.

---

## 2. Objetivos arquiteturais

A arquitetura do MemDeck busca priorizar:

- simplicidade durante o desenvolvimento do MVP;
- separação clara de responsabilidades;
- regras de negócio independentes da interface;
- facilidade de testes;
- possibilidade de adicionar novos clientes no futuro;
- evolução incremental sem adoção prematura de microserviços;
- segurança dos dados de cada usuário;
- observabilidade e documentação da API;
- facilidade de manutenção por uma equipe pequena.

O projeto segue o princípio de introduzir complexidade somente quando existir uma necessidade concreta.

---

## 3. Estrutura atual do monorepo

```text
memdeck/
├── frontend/
│   └── aplicação web React
│
├── backend/
│   ├── src/
│   │   └── módulos da API
│   └── prisma/
│       └── modelo de dados
│
├── docs/
│   └── documentação técnica
│
├── .github/
│   └── workflows de CI
│
├── package.json
└── README.md
```

### `frontend/`

Responsável por:

- telas;
- navegação;
- experiência de estudo;
- gerenciamento do estado da interface;
- comunicação HTTP com a API;
- armazenamento e envio do token de autenticação.

### `backend/`

Responsável por:

- autenticação;
- autorização;
- regras de negócio;
- gerenciamento de decks;
- gerenciamento de cards;
- processamento das revisões;
- cálculo do próximo momento de revisão;
- acesso ao banco de dados;
- exposição da API HTTP.

### `docs/`

Contém documentação de arquitetura e decisões técnicas relevantes do projeto.

---

## 4. Domínio principal

O domínio atual do MemDeck possui quatro conceitos centrais.

```text
User
 │
 └── Deck
      │
      └── Card
           │
           └── Review
```

### User

Representa uma pessoa cadastrada na plataforma.

Um usuário pode possuir vários baralhos.

### Deck

Agrupa cards relacionados a um assunto de estudo.

Cada deck pertence a um único usuário.

### Card

Representa uma unidade de estudo contendo:

```text
front → pergunta/conteúdo

back → resposta
```

Cada card pertence a um deck.

### Review

Representa uma interação de estudo realizada sobre um card.

A revisão registra informações como:

```text
rating
reviewedAt
nextReviewAt
```

Esses dados permitem determinar quando o card deverá voltar para uma sessão de estudo.

---

## 5. Backend como monólito modular

O backend permanece deliberadamente como um **monólito modular**.

Os módulos atuais incluem:

```text
Auth
Decks
Cards
Reviews
```

Cada módulo representa uma capacidade do domínio.

```text
backend/src/modules/

auth/
decks/
cards/
reviews/
```

Essa abordagem mantém uma única aplicação para execução e deploy, enquanto evita concentrar todo o sistema em um único arquivo ou camada.

### Por que não utilizar microserviços agora?

O volume e a complexidade atuais do MemDeck não justificam:

- comunicação entre múltiplos serviços;
- service discovery;
- filas obrigatórias;
- observabilidade distribuída;
- múltiplos pipelines de deploy;
- bancos independentes por serviço.

Essas tecnologias aumentariam significativamente a complexidade operacional sem resolver um problema atual do produto.

O MemDeck poderá extrair serviços específicos no futuro caso existam necessidades reais de escala ou isolamento.

---

## 6. Regra de revisão espaçada

A revisão espaçada pertence ao domínio do backend.

O cliente envia a avaliação realizada pelo usuário:

```text
AGAIN
HARD
GOOD
EASY
```

A API calcula quando o card deverá voltar para revisão.

Na implementação inicial:

```text
AGAIN → +1 dia
HARD  → +1 dia
GOOD  → +2 dias
EASY  → +3 dias
```

O resultado é armazenado em:

```text
Review.nextReviewAt
```

Essa decisão mantém a regra de negócio centralizada na API.

Assim, diferentes clientes — web ou futuros aplicativos — produzem o mesmo comportamento de revisão.

---

## 7. Fluxo de estudo

Um fluxo simplificado de estudo é:

```text
Usuário
   │
   ▼
Seleciona Deck
   │
   ▼
Seleciona modo de estudo
   │
   ▼
Frontend solicita cards disponíveis
   │
   ▼
API identifica cards elegíveis
   │
   ▼
Usuário responde ao card
   │
   ▼
Frontend envia rating
   │
   ▼
API calcula nextReviewAt
   │
   ▼
Review é persistido
```

Um card é considerado disponível quando:

```text
nunca foi revisado

OU

nextReviewAt <= momento atual
```

Cards cuja próxima revisão ainda está no futuro não participam da sessão atual.

---

## 8. Autenticação e autorização

A autenticação atualmente suporta credenciais e integração com Google.

Após autenticação, a API emite um JWT.

```text
Login
  │
  ▼
API valida usuário
  │
  ▼
JWT
  │
  ▼
Cliente
```

Nas chamadas protegidas:

```text
Authorization: Bearer <token>
```

A API utiliza o identificador presente no token para garantir que operações sejam realizadas somente sobre recursos pertencentes ao usuário autenticado.

A autorização deve permanecer no backend.

O frontend pode esconder ou bloquear elementos da interface, mas isso não substitui validações de segurança na API.

---

## 9. Persistência

A persistência utiliza:

```text
Prisma
   │
   ▼
PostgreSQL
   │
   ▼
Neon
```

O Prisma funciona como camada de acesso aos dados e mantém o schema do domínio persistente.

Relacionamentos principais:

```text
User 1 ─── N Deck

Deck 1 ─── N Card

Card 1 ─── N Review
```

As relações utilizam remoção em cascata onde apropriado.

---

## 10. API

A comunicação entre clientes e backend ocorre através de uma API HTTP utilizando JSON.

O Fastify é responsável pela camada HTTP.

A documentação da API é disponibilizada através de OpenAPI/Swagger.

```text
/docs
```

Isso permite que futuras aplicações consumam a mesma interface pública sem depender da implementação do frontend web.

---

## 11. Clientes da plataforma

Hoje existe um único cliente:

```text
MemDeck Web
```

Entretanto, a arquitetura evita acoplar regras essenciais ao frontend.

Isso permite que outros clientes sejam adicionados futuramente.

```text
                     ┌─────────────────┐
                     │   MemDeck Web   │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │                 │
Future Mobile ──────►│   MemDeck API   │◄──── Future Admin
                     │                 │
                     └────────┬────────┘
                              │
                         PostgreSQL
```

Possíveis clientes futuros incluem:

- aplicativo mobile;
- painel administrativo;
- extensões ou integrações externas.

Esses componentes são possibilidades arquiteturais e não representam funcionalidades atualmente implementadas.

---

## 12. Evolução futura do monorepo

Enquanto existirem apenas o frontend web e a API, a estrutura atual permanece adequada:

```text
frontend/
backend/
```

Caso o MemDeck passe a possuir diversos aplicativos, a organização poderá evoluir para:

```text
apps/
├── web/
├── api/
├── mobile/
└── admin/

packages/
├── contracts/
├── ui/
└── config/
```

Essa mudança não é necessária no estágio atual.

Ela deve acontecer somente quando existirem módulos realmente compartilhados ou múltiplas aplicações que justifiquem essa organização.

---

## 13. Contratos compartilhados

Com múltiplos clientes, manter contratos consistentes entre API e aplicações se torna mais importante.

Uma possível evolução será criar contratos compartilhados ou gerar tipos a partir da especificação OpenAPI.

Exemplo futuro:

```text
API
 │
 ├── OpenAPI
 │
 ▼
Types / SDK
 │
 ├── Web
 ├── Mobile
 └── Admin
```

Isso reduz divergências entre os formatos esperados pelo frontend e os retornados pelo backend.

Essa camada ainda não faz parte da arquitetura atual.

---

## 14. Funcionalidades assíncronas futuras

Algumas funcionalidades futuras podem exigir processamento que não deve bloquear uma requisição HTTP.

Exemplos possíveis:

```text
geração de cards
importação de conteúdo
processamento de documentos
notificações
tarefas com IA
```

Nesse cenário, a arquitetura poderá evoluir para:

```text
Cliente
   │
   ▼
API
   │
   ├── operações síncronas
   │
   └── Job
        │
        ▼
      Queue
        │
        ▼
      Worker
```

Essa infraestrutura não deve ser adicionada antes de existir uma necessidade concreta.

---

## 15. Inteligência artificial

Funcionalidades baseadas em IA podem futuramente complementar o domínio do MemDeck sem substituir suas regras centrais.

Possíveis casos de uso:

```text
texto → sugestão de flashcards

documento → extração de conteúdo → cards

conteúdo → perguntas de revisão

card → sugestões de melhoria
```

A geração por IA deve ser tratada como uma capacidade auxiliar.

A fonte de verdade dos decks, cards, revisões e algoritmo de estudo continua pertencendo ao domínio principal do MemDeck.

Uma arquitetura futura poderia seguir:

```text
Documento / Texto
       │
       ▼
      API
       │
       ▼
AI Processing
       │
       ▼
Sugestões de cards
       │
       ▼
Usuário revisa
       │
       ▼
Cards persistidos
```

Conteúdo gerado automaticamente não deve ser persistido como material definitivo sem validação adequada do fluxo de produto.

---

## 16. Observabilidade

O Fastify atualmente utiliza logging da aplicação.

À medida que o produto crescer, a observabilidade poderá evoluir para incluir:

```text
logs estruturados
métricas
monitoramento de erros
tracing
health checks
```

O endpoint:

```text
GET /health
```

fornece atualmente uma verificação básica da disponibilidade da API.

---

## 17. Integração contínua

O projeto utiliza GitHub Actions.

Atualmente a integração contínua valida frontend e backend separadamente.

```text
Pull Request / Push
        │
        ├── Frontend
        │     ├── lint
        │     └── build
        │
        └── Backend
              └── tests
```

Essa separação permite identificar falhas por aplicação mesmo mantendo todo o projeto em um único repositório.

---

## 18. Princípios para evolução

As seguintes regras orientam decisões futuras de arquitetura:

### Regra 1 — domínio antes da infraestrutura

Não introduzir ferramentas apenas porque são populares.

### Regra 2 — uma fonte de verdade

Regras críticas de negócio devem permanecer centralizadas.

### Regra 3 — novos clientes não duplicam regras

Web, mobile ou outros clientes devem consumir a mesma lógica fornecida pelo backend.

### Regra 4 — modularizar antes de distribuir

Antes de transformar um módulo em microserviço, garantir que seus limites estejam bem definidos dentro do monólito.

### Regra 5 — medir antes de escalar

Mudanças de infraestrutura devem responder a problemas observados e mensuráveis.

### Regra 6 — evolução incremental

A arquitetura deverá crescer junto com as necessidades do produto, evitando complexidade prematura.

---

## 19. Estado atual e estado futuro

É importante distinguir arquitetura implementada de arquitetura planejada.

### Implementado atualmente

```text
✓ Monorepo
✓ React Web
✓ Fastify API
✓ JWT
✓ autenticação com credenciais
✓ integração de autenticação Google
✓ módulos Auth, Decks, Cards e Reviews
✓ Prisma
✓ PostgreSQL / Neon
✓ revisão espaçada
✓ Swagger / OpenAPI
✓ GitHub Actions
✓ testes de backend
```

### Evoluções possíveis

```text
○ aplicativo mobile
○ painel administrativo
○ contratos tipados compartilhados
○ funcionalidades baseadas em IA
○ processamento assíncrono
○ notificações
○ observabilidade avançada
```

Itens futuros representam direções possíveis e não funcionalidades já entregues.

---

## 20. Histórico da arquitetura

Em 30 de outubro de 2026, os históricos independentes dos antigos repositórios de frontend e backend foram consolidados no monorepo:

```text
camillafontenele/memdeck
```

A migração preservou os commits anteriores.

Os projetos foram posicionados nos diretórios:

```text
frontend/
backend/
```

Essa mudança criou um ponto único para código, documentação, automação e evolução arquitetural do MemDeck sem remover a separação lógica entre as aplicações.
