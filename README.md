# Cardigan Web — Fichas de Personagem

Gerenciador de fichas de personagem do sistema Cardigan, standalone (fora do Foundry VTT). Portado de `sistema-cardigan-fichas - Copia.html` (um app single-file feito originalmente pra rodar como Claude Artifact) pra um projeto Next.js completo, com contas de usuário, banco PostgreSQL, **múltiplas mesas independentes** (uma sala com senha por grupo de jogo) e chat de mesa em tempo real — pensado pra rodar numa VPS própria.

## Stack

- **Next.js 16 (App Router) + TypeScript**, servido por um `server.js` customizado que anexa o **Socket.io** no mesmo servidor HTTP (necessário pro chat de mesa em tempo real).
- **Prisma 6 + PostgreSQL** — contas, mesas (com senha de convite), fichas, biblioteca de raças e histórico de chat.
- **NextAuth (Auth.js) v5** — login por usuário/senha (bcrypt), sessão JWT.
- Catálogos de regras (efeitos, armas, armaduras, habilidades de classe, manual) ficam em `data/*.ts`, extraídos do HTML original — ver "Catálogos de regras" abaixo.

## Setup local

**Caminho rápido (Linux/macOS com Docker):** `bash scripts/setup.sh` faz os passos 1-5 abaixo sozinho (sobe o Postgres do `docker-compose.yml`, copia `.env.example`, instala dependências, roda a migração inicial e o seed). Só falta ajustar `AUTH_SECRET` no `.env` depois.

Passo a passo manual:

1. **Banco de dados**: `docker compose up -d db` (usa o `docker-compose.yml` do repo) ou suba um Postgres por conta própria.
2. Copie `.env.example` pra `.env` e ajuste `DATABASE_URL` / gere um `AUTH_SECRET` (`openssl rand -base64 32`).
3. Instale as dependências: `npm install`.
4. Rode a migração inicial: `npx prisma migrate dev --name init` (primeira vez — cria `prisma/migrations/`) ou `npm run prisma:deploy` se as migrações já existirem.
5. Popule as raças padrão: `npm run prisma:seed`.
6. Suba o servidor: `npm run dev` (roda `node server.js`, com Next em modo dev + Socket.io na mesma porta, padrão `3000`).
7. Crie uma conta em `/register` e comece a criar fichas.

**Vincular ao GitHub:** `bash scripts/link-github.sh <url-do-repo>` — inicializa o git, adiciona o remote, e faz o push inicial (pede confirmação manual se o remoto já tiver commits, em vez de sobrescrever).

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
server.js              # Next.js + Socket.io no mesmo processo/porta (uma sala por mesa)
prisma/schema.prisma    # User, Mesa, MesaMembro, Sheet, Race, ChatMessage
prisma/seed.ts          # seed das raças padrão
app/(app)/mesas/        # lista de mesas do usuário (tela pós-login) + criar/entrar
app/(app)/mesas/[mesaId]/  # tudo escopado por mesa: galeria, ficha, wizard, regras, log
app/login, app/register # autenticação
app/api/                # rotas REST (mesas, sheets, races, chat, register, auth)
components/mesas/       # tela de lobby (listar/criar/entrar em mesa)
components/sheet/       # painéis da ficha (stats, perícias, habilidades, equipamento, efeitos)
components/dialogs/      # diálogos portados do app original (rolagem, subir de nível, equipar...) + criar/entrar em mesa
components/chat/         # chat de mesa em tempo real (Socket.io, escopado por mesaId)
lib/dice.ts, lib/derived.ts  # fórmulas oficiais e motor de dados, portados do app original
data/*.ts                # catálogos de regras extraídos do HTML original
```

## Catálogos de regras (`data/*.ts`)

Esses arquivos foram **extraídos automaticamente** do `sistema-cardigan-fichas - Copia.html` original (efeitos, armas, armaduras, habilidades por classe, manual de regras) — não foram digitados à mão, então têm fidelidade garantida com a versão do HTML usada na extração. Se as regras do sistema mudarem, esses arquivos precisam ser atualizados manualmente (ou re-extraídos do HTML atualizado). A raça é a única "biblioteca" que já vive no banco (tabela `Race`), porque é editável em runtime pelos jogadores.

**Sincronização automática com os compêndios do Foundry (`src/packs/` do sistema `cardigan`) ainda não foi implementada** — os dois lados podem divergir com o tempo se um for atualizado sem o outro. Fica como próximo passo se for necessário.

## O que já funciona

- Login/registro de conta (usuário/senha).
- **Mesas**: tela pós-login lista as mesas em que o usuário está; "+ Criar Mesa" gera um código de 6 caracteres + define uma senha (o usuário vira o Mestre, já membro automático); "Entrar em Mesa" pede código + senha do Mestre. Cada mesa tem suas próprias fichas e seu próprio chat, isolados uns dos outros (inclusive a sala do Socket.io).
- Galeria de fichas da mesa (todas / minhas), ficha de exemplo pronta ("Harry de Hazel"), criação via wizard guiado (6 passos: identidade, raça, classe, perícias, equipamento, biografia).
- Ficha completa: PV/PE com barras, bônus permanente e temporário, e descanso curto/longo; fraturas, sanidade, toxidade, fome e sede rastreados com pips e avisos; armadura atual/máxima com bônus manual e fluxo de "sofrer dano" (desconta armadura, consome bônus temporário) com opção de ignorar armadura; XP com gate de 100 pra liberar o diálogo de subir de nível; sistema de Julgamento completo (Sentenças/Dádivas, Executar, Poupar, estado de morto); pontos de ação por turno; perícias com bônus persistente por perícia e rolagem (d20 + vantagem/desvantagem/bônus); habilidades de raça/classe com contador de usos e toggle de aprimoramento ativo/inativo; Espaços de Inventário por peso (leve/médio/pesado); equipar/desequipar armas e armaduras (tabelas separadas de equipado/inventário) com durabilidade, propriedades de arma expansíveis e botão de ataque (rolagem, crítico, erro crítico desgasta a arma); remédios com usos; efeitos ativos (catálogo completo, com dano direto); baixar a ficha como imagem (PNG).
- Chat de mesa em tempo real (Socket.io, uma sala por mesa) com rolagens `/r XdY+Z`, dados rápidos, "Limpar tudo", log persistido no banco e página de histórico completo ("Log da Mesa") — tudo escopado pra mesa atual.
- Fichas privadas (só o dono vê) ou públicas (toda a mesa vê).

## Simplificações conhecidas em relação ao app original

- Gerenciar uma mesa (remover jogador, trocar senha/código, apagar a mesa) ainda não tem UI — só criar e entrar.
- O manual de regras e os catálogos são cópia estática do HTML original, compartilhados entre todas as mesas — ver seção acima.

## Deploy na VPS (Hostinger KVM 1 ou similar)

Já foi executado de verdade (não é só um roteiro teórico) — rodando em produção em
`cardiganficha.online`. Passos, com os detalhes que realmente importaram na prática:

1. Instale Node.js LTS, PostgreSQL, Nginx e git na VPS (ou use um Postgres gerenciado).
2. Clone o projeto, `npm install`, configure `.env` com:
   - `DATABASE_URL` real e um `AUTH_SECRET` novo (não reuse o de dev).
   - `NODE_ENV=production` — **importante**: PM2 *não* seta isso sozinho por padrão (apesar
     do que uma versão antiga deste README dizia). Sem essa variável o app sobe em modo dev
     mesmo em produção, e o Next.js bloqueia os bundles JS pra qualquer origem que não seja
     "localhost" — quebra qualquer interação client-side (formulários não enviam nada).
   - `AUTH_URL=https://seu-dominio` (a URL pública final, com `https://`) — sem isso o
     NextAuth erra o cookie de sessão (`__Secure-` prefix) especificamente na conexão do
     Socket.io (`getToken()` chamado direto em `server.js` não deriva isso sozinho de
     `AUTH_TRUST_HOST`/headers do proxy do jeito que o resto do Auth.js faz), e o chat em
     tempo real fica "mudo" (conecta mas nunca autentica) mesmo com login funcionando normal.
3. `npm run build`, depois `npm run prisma:deploy` e `npm run prisma:seed` (só na primeira
   vez — repare que `prisma:seed` roda via `tsx`, que não carrega `.env` sozinho; exporte as
   variáveis antes: `set -a && . ./.env && set +a && npm run prisma:seed`).
4. Rode com **PM2**: `pm2 start server.js --name ccf-web`, depois `pm2 save` e
   `pm2 startup` (sobrevive a reboot da VPS).
5. **Nginx** como proxy reverso pra porta do Next (padrão 3000), incluindo os headers de
   upgrade pro WebSocket do Socket.io funcionar:
   ```nginx
   location / {
     proxy_pass http://127.0.0.1:3000;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
6. **Firewall (ufw)**: libere só `OpenSSH`/`80`/`443`; nunca exponha a porta 3000 direto.
   Desative login por senha no SSH (`PasswordAuthentication no`) depois de confirmar que o
   acesso por chave funciona — é o alvo nº1 de bots varrendo a internet.
7. HTTPS com Certbot/Let's Encrypt na frente do Nginx (`certbot --nginx -d seu-dominio`).

**Atualizar depois de mudar código**: `git pull`, `npm install` (se mudou dependência),
`npm run prisma:deploy` (se mudou o schema), `npm run build`, `pm2 restart ccf-web`.
