/**
 * Socket.io Client — Bac DZ AI
 * Connects to the signaling server for WebRTC
 */

import { io, Socket } from "socket.io-client";

// ─── Server URL ──────────────────────────────────────────────────────────────
// In production, change this to your deployed server URL
// e.g. "https://your-server.railway.app"
const SOCKET_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SOCKET_URL) || "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("🟢 Socket.io connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket.io disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("⚠️ Socket.io connection error:", err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default getSocket;
