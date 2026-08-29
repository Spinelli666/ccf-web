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
      socket.data.user = { id: token.id, username: token.username, name: token.name };
      next_();
    } catch {
      next_(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join("table");

    socket.on("chat:send", async (payload, ack) => {
      try {
        const user = socket.data.user;
        const kind = payload?.kind === "roll" ? "roll" : "text";
        const message = await prisma.chatMessage.create({
          data: {
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
        io.to("table").emit("chat:new", message);
        if (ack) ack({ ok: true, message });
      } catch (err) {
        console.error("chat:send failed", err);
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("chat:delete", async (id, ack) => {
      try {
        await prisma.chatMessage.delete({ where: { id: String(id) } });
        io.to("table").emit("chat:deleted", id);
        if (ack) ack({ ok: true });
      } catch {
        if (ack) ack({ ok: false, error: "failed" });
      }
    });

    socket.on("chat:clear", async (_payload, ack) => {
      try {
        await prisma.chatMessage.deleteMany({});
        io.to("table").emit("chat:cleared");
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error("chat:clear failed", err);
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
