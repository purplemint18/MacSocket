import { WebSocket } from "ws";
import { clientService } from "@/services";
import type { WebsocketContext } from "./types";

export const broadcastClientList = async (ctx: WebsocketContext) => {
  const clients = await clientService.getAllClients();
  const message = JSON.stringify({ type: "client_list", data: clients });
  ctx.frontendSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  });
};

