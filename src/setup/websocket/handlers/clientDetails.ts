import { WebSocket } from "ws";
import { clientService } from "@/services";
import { Logger } from "@/utils";
import type { ExtWebSocket, WebsocketContext } from "../types";
import { broadcastClientList } from "../broadcast";

export const handleGetClientDetails = async (
  ctx: WebsocketContext,
  ws: ExtWebSocket,
  data: { device_id: string },
) => {
  const { device_id } = data;
  const clientWs = ctx.clientSockets.get(device_id);

  if (clientWs && clientWs.readyState === WebSocket.OPEN) {
    const requestId = ctx.nextRequestId("req_");

    const timer = setTimeout(async () => {
      ctx.pendingRequests.delete(requestId);
      const fallback = await clientService.getClientByDeviceId(device_id);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "client_details",
            data: fallback,
            drives: [],
          }),
        );
      }
      Logger.warn(`Request ${requestId} timed out, sent DB fallback`);
    }, 10000);

    ctx.pendingRequests.set(requestId, {
      frontendWs: ws,
      deviceId: device_id,
      timer,
    });

    clientWs.send(JSON.stringify({ type: "request_info", request_id: requestId }));
    Logger.info(`Forwarded info request to client ${device_id} (${requestId})`);
  } else {
    const client = await clientService.getClientByDeviceId(device_id);
    ws.send(
      JSON.stringify({
        type: "client_details",
        data: client,
        drives: [],
      }),
    );
  }
};

export const handleClientInfoResponse = async (
  ctx: WebsocketContext,
  _ws: ExtWebSocket,
  data: {
    device_id: string;
    os_type: string;
    public_ip: string;
    username: string;
    request_id: string;
    drives?: unknown[];
    chrome_directories?: unknown[];
  },
) => {
  const { device_id, os_type, public_ip, username, request_id, drives, chrome_directories } =
    data;

  const pending = ctx.pendingRequests.get(request_id);
  if (!pending) return;

  clearTimeout(pending.timer);
  ctx.pendingRequests.delete(request_id);

  const updated = await clientService.upsertClient({
    deviceId: device_id,
    osType: os_type,
    publicIp: public_ip,
    username,
  });

  if (pending.frontendWs.readyState === WebSocket.OPEN) {
    pending.frontendWs.send(
      JSON.stringify({
        type: "client_details",
        data: updated,
        drives: drives || [],
        chrome_directories: chrome_directories || [],
      }),
    );
  }

  await broadcastClientList(ctx);
  Logger.info(`Fresh data stored and sent for ${device_id} (${request_id})`);
};

