import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { clientService } from "@/services";
import { Logger } from "@/utils";

interface ExtWebSocket extends WebSocket {
  deviceId?: string;
  clientType?: "client" | "frontend";
  isAlive?: boolean;
}

interface PendingRequest {
  frontendWs: ExtWebSocket;
  deviceId: string;
  timer: ReturnType<typeof setTimeout>;
}

let requestCounter = 0;

export const websocketSetup = (server: Server) => {
  const wss = new WebSocketServer({ server });

  const frontendSockets = new Set<ExtWebSocket>();
  const clientSockets = new Map<string, ExtWebSocket>();
  const pendingRequests = new Map<string, PendingRequest>();

  const broadcastToFrontends = async () => {
    const clients = await clientService.getAllClients();
    const message = JSON.stringify({ type: "client_list", data: clients });
    frontendSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    });
  };

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

  wss.on("connection", (raw: WebSocket) => {
    const ws = raw as ExtWebSocket;
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());

        switch (msg.type) {
          case "client_connect": {
            const { device_id, os_type, public_ip, username } = msg.data;
            ws.deviceId = device_id;
            ws.clientType = "client";
            clientSockets.set(device_id, ws);

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
            await broadcastToFrontends();
            Logger.info(`Client connected: ${device_id}`);
            break;
          }

          case "frontend_connect": {
            ws.clientType = "frontend";
            frontendSockets.add(ws);
            const clients = await clientService.getAllClients();
            ws.send(JSON.stringify({ type: "client_list", data: clients }));
            Logger.info("Frontend dashboard connected");
            break;
          }

          case "get_client_details": {
            const { device_id } = msg.data;
            const clientWs = clientSockets.get(device_id);

            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
              const requestId = `req_${++requestCounter}`;

              const timer = setTimeout(async () => {
                pendingRequests.delete(requestId);
                const fallback =
                  await clientService.getClientByDeviceId(device_id);
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

              pendingRequests.set(requestId, {
                frontendWs: ws,
                deviceId: device_id,
                timer,
              });

              clientWs.send(
                JSON.stringify({ type: "request_info", request_id: requestId }),
              );
              Logger.info(
                `Forwarded info request to client ${device_id} (${requestId})`,
              );
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
            break;
          }

          case "client_info_response": {
            const {
              device_id,
              os_type,
              public_ip,
              username,
              request_id,
              drives,
            } = msg.data;

            const pending = pendingRequests.get(request_id);
            if (pending) {
              clearTimeout(pending.timer);
              pendingRequests.delete(request_id);

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
                  }),
                );
              }

              await broadcastToFrontends();
              Logger.info(
                `Fresh data stored and sent for ${device_id} (${request_id})`,
              );
            }
            break;
          }

          case "heartbeat": {
            ws.isAlive = true;
            if (ws.deviceId) {
              await clientService.updateLastSeen(ws.deviceId);
            }
            break;
          }
        }
      } catch (err) {
        Logger.error("WebSocket message error:", err);
      }
    });

    ws.on("close", async () => {
      if (ws.clientType === "frontend") {
        frontendSockets.delete(ws);
        Logger.info("Frontend dashboard disconnected");
      } else if (ws.clientType === "client" && ws.deviceId) {
        clientSockets.delete(ws.deviceId);
        await clientService.setClientOffline(ws.deviceId);
        await broadcastToFrontends();
        Logger.info(`Client disconnected: ${ws.deviceId}`);
      }
    });
  });

  Logger.info("WebSocket server initialized");
};
