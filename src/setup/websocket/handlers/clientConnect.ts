import { clientService } from "@/services";
import { Logger } from "@/utils";
import type { ExtWebSocket, WebsocketContext } from "../types";
import { broadcastClientList } from "../broadcast";

export const handleClientConnect = async (
  ctx: WebsocketContext,
  ws: ExtWebSocket,
  data: { device_id: string; os_type: string; public_ip: string; username: string },
) => {
  const { device_id, os_type, public_ip, username } = data;
  ws.deviceId = device_id;
  ws.clientType = "client";
  ctx.clientSockets.set(device_id, ws);

  await clientService.upsertClient({
    deviceId: device_id,
    osType: os_type,
    publicIp: public_ip,
    username,
  });

  ws.send(
    JSON.stringify({
      type: "connected",
      data: { message: "Registered successfully" },
    }),
  );
  await broadcastClientList(ctx);
  Logger.info(`Client connected: ${device_id}`);
};

