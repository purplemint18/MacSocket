import type { WebSocketServer } from "ws";
import type { ExtWebSocket } from "./types";

export const setupHeartbeat = (wss: WebSocketServer) => {
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((raw) => {
      const ws = raw as ExtWebSocket;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(heartbeatInterval));
};

