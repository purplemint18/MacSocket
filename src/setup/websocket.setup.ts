import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { Logger } from "@/utils";
import { clientService } from "@/services";
import type { ExtWebSocket, WebsocketContext } from "./websocket/types";
import { setupHeartbeat } from "./websocket/heartbeat";
import { broadcastClientList } from "./websocket/broadcast";
import { handleMessage } from "./websocket/message.handler";

export const websocketSetup = (server: Server) => {
  const wss = new WebSocketServer({ server });

  let requestCounter = 0;
  const ctx: WebsocketContext = {
    frontendSockets: new Set<ExtWebSocket>(),
    clientSockets: new Map<string, ExtWebSocket>(),
    pendingRequests: new Map(),
    nextRequestId: (prefix: string) => `${prefix}${++requestCounter}`,
  };

  setupHeartbeat(wss);

  wss.on("connection", (raw: WebSocket) => {
    const ws = raw as ExtWebSocket;
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (rawData) => {
      try {
        await handleMessage(ctx, ws, rawData);
      } catch (err) {
        Logger.error("WebSocket message error:", err);
      }
    });

    ws.on("close", async () => {
      if (ws.clientType === "frontend") {
        ctx.frontendSockets.delete(ws);
        Logger.info("Frontend dashboard disconnected");
      } else if (ws.clientType === "client" && ws.deviceId) {
        ctx.clientSockets.delete(ws.deviceId);
        // keep client list consistent for all frontends
        await clientService.setClientOffline(ws.deviceId);
        await broadcastClientList(ctx);
        Logger.info(`Client disconnected: ${ws.deviceId}`);
      }
    });
  });

  Logger.info("WebSocket server initialized");
};
