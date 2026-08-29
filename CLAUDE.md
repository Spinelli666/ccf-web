# CLAUDE.md

Contexto para o Claude Code ao trabalhar neste repositório (`ccf-web`).

## O que é este projeto

`ccf-web` é a versão web standalone do gerenciador de fichas do sistema de RPG **Cardigan**, fora do Foundry VTT. Foi portado de um app single-file (`sistema-cardigan-fichas - Copia.html`, feito originalmente pra rodar como Claude Artifact) pra um app Next.js completo com contas de usuário, PostgreSQL e chat de mesa em tempo real — pra rodar numa VPS própria (Hostinger KVM 1).

O sistema Cardigan (o jogo em si) vive num repositório **separado**: o sistema Foundry VTT em `../cardigan` (fork do boilerplate CardiganSystem). Esse repo (`ccf-web`) é um projeto irmão, independente, com seu próprio deploy — não depende do Foundry rodando.

**Leia `README.md` primeiro** — tem o setup completo, scripts, estrutura de pastas e a lista do que já funciona / simplificações conhecidas. Este arquivo (`CLAUDE.md`) é sobre *como continuar trabalhando no projeto*, não repete o que já está no README.

## Como isso foi construído

Todo o conteúdo de regras (`data/*.ts` — efeitos, armas, armaduras, habilidades de classe, manual de regras) foi **extraído programaticamente** do HTML original com um script Node (bracket-matching + `eval` dos literais JS), não digitado à mão — por isso tem fidelidade garantida com a versão do HTML usada na extração. Se for atualizar essas regras, ou reextrai do HTML atualizado, ou edita os `data/*.ts` diretamente (eles têm um comentário "Auto-extracted... Do not hand-edit generated sections" no topo — pode editar se necessário, só não é auto-sincronizado).

A lógica de negócio pura (`lib/dice.ts`, `lib/derived.ts`) foi portada quase 1:1 das funções `rollDie`/`rollWithMode`/`parseDiceCommand`/`computeDerived` do HTML original.

Os componentes React (`components/sheet/*`, `components/dialogs/*`, `components/wizard/*`) são reimplementações idiomáticas em React das seções equivalentes do HTML (`renderSheet`, `showLevelUpDialog`, `renderWizard`, etc.) — não são um port literal de string templates, foram redesenhados como componentes controlados por state.

## Status atual (verificado, não só "deveria funcionar")

`tsc --noEmit`, `eslint` e `next build` limpos. Rodou de verdade contra um Postgres real (via `scripts/setup.sh`/`docker-compose.yml`, migração inicial `prisma/migrations/20260829053242_init` já gerada e aplicada, raças semeadas) — registro de conta, login via NextAuth, criação de ficha, rolagem de dado e chat em tempo real entre duas contas foram testados ponta-a-ponta (via requisições HTTP/WebSocket reais, sem navegador interativo disponível no ambiente) e confirmados funcionando. O git já está vinculado ao GitHub (`origin` → `https://github.com/Spinelli666/ccf-web.git`, branch `main`).

Os recursos que faltavam em relação ao app original (durabilidade de arma/armadura, toggle de aprimoramento, Insanidade/Toxidade/Fome/Sede, bônus temporário de PV/PE, sistema de Julgamento completo, pontos de ação, ataque com arma, ficha de exemplo, baixar como imagem, Log da Mesa completo, limpar chat) foram portados — ver README, seção "O que já funciona". Essa parte também só foi verificada por `tsc`/`eslint`/`build` limpos e testes de API/socket direcionados (round-trip de campos novos, `chat:clear`, compatibilidade com fichas salvas antes da mudança) — **não por clique real na UI**, já que não há navegador interativo neste ambiente.

### Pendências conhecidas (retomar aqui)

1. **Testar a UI nova num navegador de verdade** (pips de sanidade/toxidade/fome/sede, fluxo de sofrer dano com armadura, painel de Julgamento, barra de pontos de ação, diálogo de ataque com arma, botão de baixar imagem) — só foi verificado por leitura de código e testes de API, nunca clicado.
2. **Deploy real na VPS Hostinger** ainda não foi feito — README tem o roteiro (PM2 + Nginx + Certbot), mas é só um roteiro, nunca foi executado.
3. **Simplificações vs. o app original que continuam de fora** (ver README, seção "Simplificações conhecidas"): Espaços de Inventário (contagem de slots por peso), bônus de perícia persistente por perícia, e sync automático dos catálogos com os compêndios do Foundry em `../cardigan/src/packs/`. Cortes conscientes de escopo — só mexer se o usuário pedir explicitamente.

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
