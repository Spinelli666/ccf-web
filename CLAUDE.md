# CLAUDE.md

Contexto para o Claude Code ao trabalhar neste repositório (`ccf-web`).

## O que é este projeto

`ccf-web` é a versão web standalone do gerenciador de fichas do sistema de RPG **Cardigan**, fora do Foundry VTT. Foi portado de um app single-file (`sistema-cardigan-fichas - Copia.html`, feito originalmente pra rodar como Claude Artifact) pra um app Next.js completo com contas de usuário, PostgreSQL, múltiplas mesas independentes (senha de convite por mesa) e chat de mesa em tempo real — pra rodar numa VPS própria (Hostinger KVM 1).

O sistema Cardigan (o jogo em si) vive num repositório **separado**: o sistema Foundry VTT em `../cardigan` (fork do boilerplate CardiganSystem). Esse repo (`ccf-web`) é um projeto irmão, independente, com seu próprio deploy — não depende do Foundry rodando.

**Leia `README.md` primeiro** — tem o setup completo, scripts, estrutura de pastas e a lista do que já funciona / simplificações conhecidas. Este arquivo (`CLAUDE.md`) é sobre *como continuar trabalhando no projeto*, não repete o que já está no README.

## Como isso foi construído

Todo o conteúdo de regras (`data/*.ts` — efeitos, armas, armaduras, habilidades de classe, manual de regras) foi **extraído programaticamente** do HTML original com um script Node (bracket-matching + `eval` dos literais JS), não digitado à mão — por isso tem fidelidade garantida com a versão do HTML usada na extração. Se for atualizar essas regras, ou reextrai do HTML atualizado, ou edita os `data/*.ts` diretamente (eles têm um comentário "Auto-extracted... Do not hand-edit generated sections" no topo — pode editar se necessário, só não é auto-sincronizado).

A lógica de negócio pura (`lib/dice.ts`, `lib/derived.ts`) foi portada quase 1:1 das funções `rollDie`/`rollWithMode`/`parseDiceCommand`/`computeDerived` do HTML original.

Os componentes React (`components/sheet/*`, `components/dialogs/*`, `components/wizard/*`) são reimplementações idiomáticas em React das seções equivalentes do HTML (`renderSheet`, `showLevelUpDialog`, `renderWizard`, etc.) — não são um port literal de string templates, foram redesenhados como componentes controlados por state.

## Status atual (verificado, não só "deveria funcionar")

`tsc --noEmit`, `eslint` e `next build` limpos. Rodou de verdade contra um Postgres real
(via `scripts/setup.sh`/`docker-compose.yml`). O git já está vinculado ao GitHub
(`origin` → `https://github.com/Spinelli666/ccf-web.git`, branch `main`).

Fluxos testados ponta-a-ponta (requisições HTTP/WebSocket reais contra o Postgres real, sem
navegador interativo disponível no ambiente — a UI em si nunca foi clicada de verdade):
registro/login, criação de ficha, rolagem de dado, chat em tempo real, todos os recursos
listados no README ("O que já funciona" — durabilidade, Julgamento completo, pontos de ação,
Espaços de Inventário, ataque com arma etc.), e o **sistema de Mesas** (criar mesa gera
código+senha, entrar com código+senha certo/errado, isolamento de fichas/chat/socket.io entre
mesas diferentes, bloqueio de não-membro).

O sistema de Mesas migrou o schema com **backfill de dado real**: a migração
`prisma/migrations/20260829153019_mesas` cria uma "Mesa Principal" (código `LEGADO1`, senha
temporária — troque se for reusar) pro que já existia antes de mesas existirem, preservando a
ficha e o histórico de chat que já estavam no banco.

### Pendências conhecidas (retomar aqui)

1. **Testar a UI num navegador de verdade** — todo o app (fichas, mesas, diálogos de criar/
   entrar) só foi verificado por leitura de código, `tsc`/`build` e testes de API/socket
   diretos, nunca clicado.
2. **Deploy real na VPS Hostinger** ainda não foi feito — README tem o roteiro (PM2 + Nginx +
   Certbot), mas é só um roteiro, nunca foi executado.
3. **Gerenciar mesa** (remover jogador, trocar senha/código, apagar mesa) não tem UI ainda —
   só criar e entrar. Corte consciente de escopo, mexer só se o usuário pedir.
4. **Simplificações que continuam de fora** (ver README): catálogos de regras/raças
   compartilhados entre todas as mesas (não há "raças customizadas por mesa"), sync automático
   com os compêndios do Foundry em `../cardigan/src/packs/`.

## Comandos úteis

Ver a tabela completa no README. Os essenciais:

```bash
bash scripts/setup.sh          # primeira vez: docker compose, install, migrate, seed
npm run dev                    # node server.js (Next + Socket.io na mesma porta)
npm run build && npm run start # produção
npx prisma studio               # inspecionar o banco visualmente
```

## Convenções

- **TypeScript em tudo**, sem `any` solto — os poucos casts existentes (`as unknown as Record<...>`) são pra contornar a inferência de literal-type do TS sobre os dados extraídos do HTML (ver `lib/classes-lookup.ts`), não gambiarra por preguiça.
- **Server Components por padrão**; `"use client"` só onde precisa de interatividade (dialogs, painéis da ficha, chat). Rotas que batem no banco têm `export const dynamic = "force-dynamic"` pra não tentar prerender em build sem DB.
- **Sem abstração prematura**: `lib/dice.ts`/`lib/derived.ts` são funções puras simples, sem camada de "engine" genérica. Os painéis da ficha (`components/sheet/*`) são um por aba, sem generalização além do necessário.
- Nomes de campos e comentários de código em português, consistente com o resto do ecossistema Cardigan (ver `../cardigan/docs-ai/project-conventions.md`).
