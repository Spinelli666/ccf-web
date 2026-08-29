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

Rodei `tsc --noEmit`, `eslint` e `next build` — todos limpos — e um smoke test real do `server.js` (boot, `/login`, `/register`, redirect de `/`, e confirmei que uma rota que bate no banco falha graciosamente em vez de derrubar o processo). **Nunca rodei isso contra um Postgres real** (não tinha Docker/Postgres disponível no ambiente onde foi construído) — os fluxos de login, criação de ficha e chat em tempo real estão implementados e verificados estruturalmente, mas não testados ponta-a-ponta com dados reais ainda. Isso é o primeiro passo a fazer no Linux.

### Pendências conhecidas (retomar aqui)

1. **Rodar de verdade pela primeira vez com um banco real.** Use `scripts/setup.sh` (sobe Postgres via `docker-compose.yml`, `npm install`, `prisma generate`, `prisma migrate dev --name init` — **ainda não existe nenhuma migração gerada**, essa é a primeira —, seed das raças, e imprime os próximos passos). Depois disso, testar manualmente: registrar conta, criar ficha pelo wizard, rolar um dado, abrir em duas abas/contas e ver o chat em tempo real funcionando.
2. **Vincular ao GitHub.** O usuário tem um repo `ccf-web` no GitHub e quer esse projeto vinculado a ele. Use `scripts/link-github.sh <url-do-repo>` (git init, remote, commit inicial, push — trata o caso do remoto já ter conteúdo pedindo decisão manual em vez de sobrescrever sem avisar). **Nunca dei `git init` nem fiz push neste projeto ainda** — a pasta pode não ter `.git/` ainda quando você ler isso.
3. **Simplificações vs. o app original** (ver README, seção "Simplificações conhecidas"): durabilidade de arma/armadura não portada, aprimoramentos de classe sem toggle ativo/inativo, Insanidade/Toxidade não rastreadas, catálogos de regras são cópia estática (sem sync automático com os compêndios do Foundry em `../cardigan/src/packs/`). Nenhuma dessas foi esquecida por engano — foram cortes conscientes de escopo. Só mexer se o usuário pedir explicitamente.
4. **Deploy real na VPS Hostinger** ainda não foi feito — README tem o roteiro (PM2 + Nginx + Certbot), mas é só um roteiro, nunca foi executado.

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
