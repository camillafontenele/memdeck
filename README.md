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
As variáveis Google e `FRONTEND_URL` são opcionais em conjunto. Configure as quatro
para habilitar o login Google, conforme as instruções abaixo.

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

## Login com Google: configuração e segurança

O backend usa Authorization Code Flow com OpenID Connect, `state`, PKCE S256 e
`nonce`. O ID token é verificado pela biblioteca oficial Google (assinatura,
emissor, audiência e expiração), com validações adicionais de `nonce`, `sub` e
`email_verified`. `User.googleId` guarda o `sub`; e-mail não vincula contas.
Uma conta local ou outra identidade Google com o mesmo e-mail resulta em erro
controlado, orientando o login pelo método original. Não há alteração de senha
ou vínculo nesses casos. Tokens Google não são persistidos.

### Google Cloud Console

1. Crie/selecione um projeto e configure Google Auth Platform: Branding, Audience
   e Data Access (tela de consentimento). Informe nome, suporte, contato, domínio
   autorizado e URLs públicas de política de privacidade/termos quando exigidas.
2. Use público External para contas pessoais. Durante Testing, adicione os
   e-mails de teste em Test users. Antes de disponibilizar a todos, publique a
   configuração e conclua as verificações solicitadas pelo Google.
3. Crie credencial OAuth do tipo **Web application**. Solicite somente `openid`,
   `email` e `profile`; não é necessário acesso ao Drive nem acesso offline.
4. Registre em Authorized redirect URIs o callback **do backend**, exatamente:
   `http://localhost:3333/auth/google/callback` para desenvolvimento e
   `https://api.seu-dominio.com/auth/google/callback` para produção.
   Não registre o retorno React como callback Google. Este fluxo não usa SDK
   JavaScript Google, portanto Authorized JavaScript origins não é usado por ele.
5. Copie Client ID/Client secret para o gerenciador de segredos do backend.
   Nunca coloque o secret em variável `VITE_`, commit ou código do frontend.

Exemplo local (backend):

```dotenv
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-secret
GOOGLE_REDIRECT_URI=http://localhost:3333/auth/google/callback
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

No frontend: `VITE_API_URL=http://localhost:3333`. Em produção, configure todas
as URLs com HTTPS, `NODE_ENV=production`, `FRONTEND_URL` como uma origem sem caminho,
e inclua essa origem exata em `CORS_ORIGIN`. Não misture `localhost` e `127.0.0.1`
durante um fluxo. Configuração OAuth parcial ou URLs inválidas impedem a inicialização.

### Sessão, domínios diferentes e hospedagem

- O navegador inicia o fluxo com um desafio SHA-256; o segredo fica em
  `sessionStorage`. A transação guarda esse desafio até a entrega final.
- O cookie de correlação do backend é HttpOnly, SameSite=Lax e host-only;
  em produção também Secure e prefixado com `__Host-`. Ele é usado somente nas
  navegações de primeiro nível. O fluxo funciona com frontend e backend em sites
  diferentes sem cookies de terceiros nem `credentials: include`.
- State expira em cinco minutos, é consumido antes de consultar Google, e exige
  o cookie do navegador correspondente. Cada início substitui o cookie anterior:
  conclua um login por navegador de cada vez.
- O código de entrega dura 60 segundos; apenas seu hash é armazenado, associado
  ao desafio original e ao usuário autenticado. A troca exige o segredo do
  frontend e a origem configurada. Consumo é síncrono/atômico e de uso único,
  inclusive quando a prova apresentada está errada.
- Somente o código opaco aparece no **fragmento** do retorno. Fragmentos não são
  enviados ao servidor do frontend nem em Referer. O script inicial de
  [index.html](frontend/index.html) remove o fragmento antes de carregar assets
  ou a aplicação; não mova esse script para depois de analytics/monitoramento.
  O JWT é entregue apenas no corpo do POST, nunca em query ou fragmento.
- O contrato JWT existente é preservado: token em `localStorage`, Bearer nas
  chamadas, prazo `JWT_EXPIRES_IN` e limpeza ao receber 401. Isso mantém o risco
  residual de XSS acessar o token e de logout não revogar tokens já copiados.
- **Uma única instância/processo do backend é obrigatória neste MVP**: transações,
  códigos e limites ficam em memória. Não use cluster, múltiplos workers,
  autoscaling ou funções serverless independentes. Um reinício cancela fluxos
  pendentes; o usuário inicia novamente. Antes de escalar, substitua por um
  armazenamento compartilhado com expiração e consumo atômico. Não há Redis
  ou nova tabela nesta implementação. Cada store suporta até 5.000 entradas.
- Configure fallback SPA para `/auth/google/return` na hospedagem do frontend.
  Sirva essa página com `Cache-Control: no-store` e `Referrer-Policy: no-referrer`.
  Se usar CSP, autorize o hash do script inicial (ou um nonce gerado pela
  hospedagem), sem habilitar genericamente `unsafe-inline`.
- Desative captura de URL completa, query, fragmento, cookies, corpos e cabeçalhos
  `Location` nas rotas `/auth/google*` e `/auth/login`/`register` em proxy, CDN,
  APM, replay de sessão e analytics. **O código da aplicação não controla logs
  externos**: configure isso antes do teste real. Não injete instrumentação antes
  do script de limpeza do frontend. O callback Google ainda recebe o código
  Google por query, portanto o proxy precisa omitir sua query dos access logs.
  O logger da API usa serializers restritos e não registra erros brutos Google.
- Configure `TRUSTED_PROXIES` apenas com IPs/CIDRs do proxy real; restrinja acesso
  direto ao backend quando necessário. Sem isso, limites por IP podem enxergar
  todos os visitantes como o mesmo proxy. Nunca confie em cabeçalhos enviados
  diretamente por qualquer cliente.

### Limites e testes

Limites por rota/IP: cadastro 5/15 minutos; login 30/15 minutos; início Google
10/minuto; callback 30/minuto; troca 20/minuto. Login/cadastro também compartilham
limite de 10/15 minutos por hash do e-mail normalizado. O bloqueio retorna 429 e
`Retry-After` antes de consultar o banco ou executar Argon2. Limites são locais à
instância e podem afetar usuários atrás de um mesmo IP; ajuste após observar uso.

`npm test` executa os testes-fonte, incluindo autenticação tradicional, tokens
Google assinados com chaves locais, replay/expiração, isolamento de contas,
troca concorrente, limites e serviço de retorno do frontend. Transporte Google
e Prisma são simulados: a suíte não usa Google real nem Neon. Para teste manual,
use banco isolado e credencial Google de teste; teste sucesso, cancelamento,
e-mail já cadastrado e recarregamento do callback.

Referências: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect),
[OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server),
[PKCE na biblioteca oficial](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/oauth2-codeVerifier.js).
