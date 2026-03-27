import { clientService } from "@/services";
import { Logger } from "@/utils";
import type { ExtWebSocket, WebsocketContext } from "../types";

export const handleFrontendConnect = async (
  ctx: WebsocketContext,
  ws: ExtWebSocket,
) => {
  ws.clientType = "frontend";
  ctx.frontendSockets.add(ws);
  const clients = await clientService.getAllClients();
  ws.send(JSON.stringify({ type: "client_list", data: clients }));
  Logger.info("Frontend dashboard connected");
};

