"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let connectedMesaId: string | null = null;

/** Reconecta automaticamente quando `mesaId` muda (troca de mesa = sala de chat diferente). */
export function getSocket(mesaId: string): Socket {
  if (socket && connectedMesaId === mesaId) return socket;
  if (socket) socket.disconnect();
  connectedMesaId = mesaId;
  socket = io({ path: "/socket.io", query: { mesaId } });
  return socket;
}
