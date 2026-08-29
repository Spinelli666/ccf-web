# Cardigan Web — Fichas de Personagem

Gerenciador de fichas de personagem do sistema Cardigan, standalone (fora do Foundry VTT). Portado de `sistema-cardigan-fichas - Copia.html` (um app single-file feito originalmente pra rodar como Claude Artifact) pra um projeto Next.js completo, com contas de usuário, banco PostgreSQL e chat de mesa em tempo real — pensado pra rodar numa VPS própria.

## Stack

- **Next.js 16 (App Router) + TypeScript**, servido por um `server.js` customizado que anexa o **Socket.io** no mesmo servidor HTTP (necessário pro chat de mesa em tempo real).
- **Prisma 6 + PostgreSQL** — contas, fichas, biblioteca de raças e histórico de chat.
- **NextAuth (Auth.js) v5** — login por usuário/senha (bcrypt), sessão JWT.
- Catálogos de regras (efeitos, armas, armaduras, habilidades de classe, manual) ficam em `data/*.ts`, extraídos do HTML original — ver "Catálogos de regras" abaixo.

## Setup local

1. **Banco de dados**: suba um Postgres local (ex.: `docker run -e POSTGRES_PASSWORD=cardigan -e POSTGRES_USER=cardigan -e POSTGRES_DB=cardigan -p 5432:5432 postgres:16`).
2. Copie `.env.example` pra `.env` e ajuste `DATABASE_URL` / gere um `AUTH_SECRET` (`openssl rand -base64 32`).
3. Instale as dependências: `npm install`.
4. Rode as migrações e o client do Prisma: `npm run prisma:migrate` (cria as tabelas) — isso já roda `prisma generate` internamente.
5. Popule as raças padrão: `npm run prisma:seed`.
6. Suba o servidor: `npm run dev` (roda `node server.js`, com Next em modo dev + Socket.io na mesma porta, padrão `3000`).
7. Crie uma conta em `/register` e comece a criar fichas.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe `server.js` (Next dev + Socket.io) |
| `npm run build` | Build de produção do Next (`next build`) |
| `npm run start` | Sobe `server.js` em modo produção (rodar depois do `build`) |
| `npm run prisma:migrate` | Cria/atualiza o schema no banco (dev) |
| `npm run prisma:deploy` | Aplica migrações em produção (sem gerar novas) |
| `npm run prisma:seed` | Insere as raças padrão (Humano, Norsca, Anão, Gnomo, Elfo) |
| `npm run lint` | ESLint |

## Estrutura

```
server.js              # Next.js + Socket.io no mesmo processo/porta
prisma/schema.prisma    # User, Sheet, Race, ChatMessage
prisma/seed.ts          # seed das raças padrão
app/(app)/              # rotas autenticadas: galeria, ficha, wizard, regras
app/login, app/register # autenticação
app/api/                # rotas REST (sheets, races, chat, register, auth)
components/sheet/       # painéis da ficha (stats, perícias, habilidades, equipamento, efeitos)
components/dialogs/      # diálogos portados do app original (rolagem, subir de nível, equipar...)
components/chat/         # chat de mesa em tempo real (Socket.io)
lib/dice.ts, lib/derived.ts  # fórmulas oficiais e motor de dados, portados do app original
data/*.ts                # catálogos de regras extraídos do HTML original
```

## Catálogos de regras (`data/*.ts`)

Esses arquivos foram **extraídos automaticamente** do `sistema-cardigan-fichas - Copia.html` original (efeitos, armas, armaduras, habilidades por classe, manual de regras) — não foram digitados à mão, então têm fidelidade garantida com a versão do HTML usada na extração. Se as regras do sistema mudarem, esses arquivos precisam ser atualizados manualmente (ou re-extraídos do HTML atualizado). A raça é a única "biblioteca" que já vive no banco (tabela `Race`), porque é editável em runtime pelos jogadores.

**Sincronização automática com os compêndios do Foundry (`src/packs/` do sistema `cardigan`) ainda não foi implementada** — os dois lados podem divergir com o tempo se um for atualizado sem o outro. Fica como próximo passo se for necessário.

## O que já funciona

- Login/registro de conta (usuário/senha).
- Galeria de fichas (todas / minhas), criação via wizard guiado (6 passos: identidade, raça, classe, perícias, equipamento, biografia).
- Ficha completa: PV/PE com barras e descanso curto/longo, fraturas, perícias com rolagem (d20 + vantagem/desvantagem/bônus), habilidades de raça/classe com contador de usos, equipar/desequipar armas e armaduras, remédios com usos, efeitos ativos (catálogo completo), subir de nível guiado.
- Chat de mesa em tempo real (Socket.io) com rolagens `/r XdY+Z`, dados rápidos, log persistido no banco.
- Fichas privadas (só o dono vê) ou públicas (toda a mesa vê).

## Simplificações conhecidas em relação ao app original

- **Durabilidade de arma/armadura** não foi portada (o app original tinha um fluxo de diálogo pra isso que não foi replicado).
- **Aprimoramentos de classe como toggle ativo/inativo** (`data-aprim-ativo` no original) — aqui são só exibidos, sem toggle.
- **Insanidade/Toxidade** não são campos rastreados nesta versão (o Descanso Longo remove Exaustão e 1 Fratura, mas não essas duas).
- O manual de regras e os catálogos são cópia estática do HTML original — ver seção acima.

## Deploy na VPS (Hostinger KVM 1 ou similar)

1. Instale Node.js LTS e PostgreSQL na VPS (ou use um Postgres gerenciado).
2. Clone o projeto, `npm install`, configure `.env` com o `DATABASE_URL` real e um `AUTH_SECRET` novo (não reuse o de dev).
3. `npm run build`, depois `npm run prisma:deploy` e `npm run prisma:seed` (só na primeira vez).
4. Rode com **PM2**: `pm2 start server.js --name ccf-web` (PM2 já seta `NODE_ENV=production` por padrão).
5. **Nginx** como proxy reverso pra porta do Next (padrão 3000), incluindo os headers de upgrade pro WebSocket do Socket.io funcionar:
   ```nginx
   location / {
     proxy_pass http://127.0.0.1:3000;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     proxy_set_header Host $host;
   }
   ```
6. HTTPS com Certbot/Let's Encrypt na frente do Nginx.

Isso ainda não foi executado nesta sessão — é um roteiro pra quando for hora de subir pra VPS de verdade.
