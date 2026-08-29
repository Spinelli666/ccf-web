// Custom server: Next.js + Socket.io on the same HTTP server/port.
// Needed because the shared table chat/dice feed requires real WebSocket push,
// which plain `next start` (serverless-style route handlers) can't provide on its own.

const { createServer } = require("node:http");
const next = require("next");
const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");
const { PrismaClient } = require("@prisma/client");

// `next()` only loads .env* files once it prepares the app — too late for the
// PORT/DATABASE_URL/AUTH_SECRET reads below, so load them explicitly first.
const { loadEnvConfig } = require("@next/env");
const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

const prisma = new PrismaClient();

async function getCombateState(mesaId) {
  const combate = await prisma.combate.findUnique({
    where: { mesaId },
    include: {
      participantes: {
        orderBy: { ordem: "asc" },
        include: { sheet: { select: { ownerId: true } } },
      },
    },
  });
  if (!combate) return null;
  return {
    id: combate.id,
    mesaId: combate.mesaId,
    rodada: combate.rodada,
    turnoAtualIndex: combate.turnoAtualIndex,
    participantes: combate.participantes.map((p) => ({
      id: p.id,
      sheetId: p.sheetId,
      sheetOwnerId: p.sheet?.ownerId ?? null,
      nome: p.nome,
      iniciativa: p.iniciativa,
      ordem: p.ordem,
      mostrarStatus: p.mostrarStatus,
    })),
  };
}

const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
  });

  io.use(async (socket, next_) => {
    try {
      const token = await getToken({
        req: socket.request,
        secret: process.env.AUTH_SECRET,
      });
      if (!token) return next_(new Error("unauthorized"));

      const mesaId = socket.handshake.query?.mesaId;
      if (!mesaId || typeof mesaId !== "string") return next_(new Error("missing mesaId"));

      const membro = await prisma.mesaMembro.findUnique({
        where: { mesaId_userId: { mesaId, userId: token.id } },
        include: { mesa: { select: { ownerId: true } } },
      });
      if (!membro) return next_(new Error("not a member of this mesa"));

      socket.data.user = { id: token.id, username: token.username, name: token.name };
      socket.data.mesaId = mesaId;
      socket.data.isGM = membro.mesa.ownerId === token.id;
      next_();
    } catch {
      next_(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const room = `mesa:${socket.data.mesaId}`;
    socket.join(room);

    socket.on("chat:send", async (payload, ack) => {
      try {
        const user = socket.data.user;
        const kind = payload?.kind === "roll" ? "roll" : payload?.kind === "log" ? "log" : "text";
        const message = await prisma.chatMessage.create({
          data: {
            mesaId: socket.data.mesaId,
            authorId: user.id,
            authorName: user.name || user.username,
            characterName: payload?.characterName || null,
            kind,
            text: String(payload?.text || "").slice(0, 2000),
            breakdown: payload?.breakdown ? String(payload.breakdown).slice(0, 2000) : null,
            total: typeof payload?.total === "number" ? payload.total : null,
            critClass: payload?.critClass || null,
          },
        });
        io.to(room).emit("chat:new", message);
        if (ack) ack({ ok: true, message });
      } catch (err) {
        console.error("chat:send failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("chat:delete", async (id, ack) => {
      try {
        const { count } = await prisma.chatMessage.deleteMany({
          where: { id: String(id), mesaId: socket.data.mesaId },
        });
        if (count === 0) {
          if (ack) ack({ ok: false, error: "not found" });
          return;
        }
        io.to(room).emit("chat:deleted", id);
        if (ack) ack({ ok: true });
      } catch {
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("chat:clear", async (_payload, ack) => {
      try {
        await prisma.chatMessage.deleteMany({ where: { mesaId: socket.data.mesaId } });
        io.to(room).emit("chat:cleared");
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error("chat:clear failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("combat:start", async (payload, ack) => {
      try {
        if (!socket.data.isGM) return ack && ack({ ok: false, error: "Apenas o mestre pode iniciar o combate." });
        const lista = Array.isArray(payload?.participantes) ? payload.participantes : [];
        if (lista.length === 0) return ack && ack({ ok: false, error: "Selecione ao menos um participante." });

        await prisma.combate.deleteMany({ where: { mesaId: socket.data.mesaId } });
        await prisma.combate.create({
          data: {
            mesaId: socket.data.mesaId,
            rodada: 1,
            turnoAtualIndex: 0,
            participantes: {
              create: lista.map((p, i) => ({
                sheetId: p?.sheetId ? String(p.sheetId) : null,
                nome: String(p?.nome || "Participante").slice(0, 80),
                mostrarStatus: !!p?.mostrarStatus,
                ordem: i,
              })),
            },
          },
        });
        const state = await getCombateState(socket.data.mesaId);
        io.to(room).emit("combat:state", state);
        if (ack) ack({ ok: true, state });
      } catch (err) {
        console.error("combat:start failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("combat:end", async (_payload, ack) => {
      try {
        if (!socket.data.isGM) return ack && ack({ ok: false, error: "Apenas o mestre pode encerrar o combate." });
        await prisma.combate.deleteMany({ where: { mesaId: socket.data.mesaId } });
        io.to(room).emit("combat:ended");
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error("combat:end failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("combat:add-participant", async (payload, ack) => {
      try {
        if (!socket.data.isGM) return ack && ack({ ok: false, error: "Apenas o mestre pode adicionar participantes." });
        const combate = await prisma.combate.findUnique({
          where: { mesaId: socket.data.mesaId },
          include: { participantes: true },
        });
        if (!combate) return ack && ack({ ok: false, error: "Nenhum combate ativo." });
        const maxOrdem = combate.participantes.reduce((m, p) => Math.max(m, p.ordem), -1);
        await prisma.combateParticipante.create({
          data: {
            combateId: combate.id,
            sheetId: payload?.sheetId ? String(payload.sheetId) : null,
            nome: String(payload?.nome || "Participante").slice(0, 80),
            mostrarStatus: !!payload?.mostrarStatus,
            ordem: maxOrdem + 1,
          },
        });
        const state = await getCombateState(socket.data.mesaId);
        io.to(room).emit("combat:state", state);
        if (ack) ack({ ok: true, state });
      } catch (err) {
        console.error("combat:add-participant failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("combat:remove-participant", async (participanteId, ack) => {
      try {
        if (!socket.data.isGM) return ack && ack({ ok: false, error: "Apenas o mestre pode remover participantes." });
        const combate = await prisma.combate.findUnique({ where: { mesaId: socket.data.mesaId } });
        if (!combate) return ack && ack({ ok: false, error: "Nenhum combate ativo." });
        await prisma.combateParticipante.deleteMany({
          where: { id: String(participanteId), combateId: combate.id },
        });
        const restantes = await prisma.combateParticipante.count({ where: { combateId: combate.id } });
        if (restantes > 0 && combate.turnoAtualIndex >= restantes) {
          await prisma.combate.update({ where: { id: combate.id }, data: { turnoAtualIndex: restantes - 1 } });
        }
        const state = await getCombateState(socket.data.mesaId);
        io.to(room).emit("combat:state", state);
        if (ack) ack({ ok: true, state });
      } catch (err) {
        console.error("combat:remove-participant failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("combat:reorder", async (ids, ack) => {
      try {
        if (!socket.data.isGM) return ack && ack({ ok: false, error: "Apenas o mestre pode reordenar." });
        const combate = await prisma.combate.findUnique({ where: { mesaId: socket.data.mesaId } });
        if (!combate) return ack && ack({ ok: false, error: "Nenhum combate ativo." });
        const lista = Array.isArray(ids) ? ids : [];
        await Promise.all(
          lista.map((id, i) =>
            prisma.combateParticipante.updateMany({
              where: { id: String(id), combateId: combate.id },
              data: { ordem: i },
            })
          )
        );
        const state = await getCombateState(socket.data.mesaId);
        io.to(room).emit("combat:state", state);
        if (ack) ack({ ok: true, state });
      } catch (err) {
        console.error("combat:reorder failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("combat:toggle-status", async (payload, ack) => {
      try {
        if (!socket.data.isGM) return ack && ack({ ok: false, error: "Apenas o mestre pode fazer isso." });
        const combate = await prisma.combate.findUnique({ where: { mesaId: socket.data.mesaId } });
        if (!combate) return ack && ack({ ok: false, error: "Nenhum combate ativo." });
        await prisma.combateParticipante.updateMany({
          where: { id: String(payload?.participanteId), combateId: combate.id },
          data: { mostrarStatus: !!payload?.mostrarStatus },
        });
        const state = await getCombateState(socket.data.mesaId);
        io.to(room).emit("combat:state", state);
        if (ack) ack({ ok: true, state });
      } catch (err) {
        console.error("combat:toggle-status failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("combat:roll-iniciativa", async (payload, ack) => {
      try {
        const combate = await prisma.combate.findUnique({ where: { mesaId: socket.data.mesaId } });
        if (!combate) return ack && ack({ ok: false, error: "Nenhum combate ativo." });
        const participante = await prisma.combateParticipante.findFirst({
          where: { id: String(payload?.participanteId), combateId: combate.id },
          include: { sheet: { select: { ownerId: true } } },
        });
        if (!participante) return ack && ack({ ok: false, error: "Participante não encontrado." });
        const podeRolar = socket.data.isGM || participante.sheet?.ownerId === socket.data.user.id;
        if (!podeRolar) return ack && ack({ ok: false, error: "Você não controla esse personagem." });

        const roll = Math.floor(Math.random() * 20) + 1;
        await prisma.combateParticipante.update({ where: { id: participante.id }, data: { iniciativa: roll } });

        const atualizados = await prisma.combateParticipante.findMany({
          where: { combateId: combate.id },
          orderBy: { ordem: "asc" },
        });
        const todosRolaram = atualizados.every((p) => p.iniciativa !== null);
        if (todosRolaram) {
          const ordenados = [...atualizados].sort(
            (a, b) => (b.iniciativa ?? 0) - (a.iniciativa ?? 0) || a.ordem - b.ordem
          );
          await Promise.all(
            ordenados.map((p, i) => prisma.combateParticipante.update({ where: { id: p.id }, data: { ordem: i } }))
          );
        }

        const message = await prisma.chatMessage.create({
          data: {
            mesaId: socket.data.mesaId,
            authorId: socket.data.user.id,
            authorName: socket.data.user.name || socket.data.user.username,
            kind: "roll",
            text: `Iniciativa — ${participante.nome}: 1d20`,
            total: roll,
            critClass: null,
          },
        });
        io.to(room).emit("chat:new", message);

        const state = await getCombateState(socket.data.mesaId);
        io.to(room).emit("combat:state", state);
        if (ack) ack({ ok: true, state });
      } catch (err) {
        console.error("combat:roll-iniciativa failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("combat:next-turn", async (_payload, ack) => {
      try {
        const combate = await prisma.combate.findUnique({
          where: { mesaId: socket.data.mesaId },
          include: {
            participantes: { orderBy: { ordem: "asc" }, include: { sheet: { select: { ownerId: true } } } },
          },
        });
        if (!combate) return ack && ack({ ok: false, error: "Nenhum combate ativo." });
        const total = combate.participantes.length;
        if (total === 0) return ack && ack({ ok: false, error: "Nenhum participante." });
        const ativo = combate.participantes[combate.turnoAtualIndex];
        const podeAvancar = socket.data.isGM || ativo?.sheet?.ownerId === socket.data.user.id;
        if (!podeAvancar) {
          return ack && ack({ ok: false, error: "Só o mestre ou quem está no turno pode avançar." });
        }
        const proximoIndex = combate.turnoAtualIndex + 1;
        const data =
          proximoIndex >= total ? { turnoAtualIndex: 0, rodada: combate.rodada + 1 } : { turnoAtualIndex: proximoIndex };
        await prisma.combate.update({ where: { id: combate.id }, data });
        const state = await getCombateState(socket.data.mesaId);
        io.to(room).emit("combat:state", state);
        if (ack) ack({ ok: true, state });
      } catch (err) {
        console.error("combat:next-turn failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Cardigan Web pronto em http://${hostname}:${port}`);
    });
});
