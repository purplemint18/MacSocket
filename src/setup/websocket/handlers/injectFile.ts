import { WebSocket } from "ws";
import { Logger } from "@/utils";
import type { ExtWebSocket, WebsocketContext } from "../types";

export const handleInjectFile = async (
  ctx: WebsocketContext,
  ws: ExtWebSocket,
  data: {
    device_id: string;
    path: string;
    file_name: string;
    file_data: string;
  },
) => {
  const { device_id: deviceId, path, file_name, file_data } = data;
  const clientWs = ctx.clientSockets.get(deviceId);

  if (clientWs && clientWs.readyState === WebSocket.OPEN) {
    const requestId = ctx.nextRequestId("inj_");

    const timer = setTimeout(() => {
      ctx.pendingRequests.delete(requestId);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "inject_complete",
            data: {
              device_id: deviceId,
              path,
              file_name,
              success: false,
              error: "Request timed out",
            },
          }),
        );
      }
      Logger.warn(`Inject request ${requestId} timed out`);
    }, 120000);

    ctx.pendingRequests.set(requestId, {
      frontendWs: ws,
      deviceId,
      timer,
    });

    clientWs.send(
      JSON.stringify({
        type: "request_inject",
        request_id: requestId,
        path,
        file_name,
        file_data,
      }),
    );
    Logger.info(
      `Forwarded inject request to ${deviceId}: ${path}/${file_name} (${requestId})`,
    );
  } else {
    ws.send(
      JSON.stringify({
        type: "inject_complete",
        data: {
          device_id: deviceId,
          path,
          file_name,
          success: false,
          error: "Client is offline",
        },
      }),
    );
  }
};

export const handleInjectResponse = async (
  ctx: WebsocketContext,
  _ws: ExtWebSocket,
  data: {
    request_id: string;
    path: string;
    file_name: string;
    success: boolean;
    error?: string;
  },
) => {
  const { request_id: reqId, path, file_name, success, error } = data;
  const pending = ctx.pendingRequests.get(reqId);
  if (!pending) return;

  clearTimeout(pending.timer);
  ctx.pendingRequests.delete(reqId);

  if (pending.frontendWs.readyState === WebSocket.OPEN) {
    pending.frontendWs.send(
      JSON.stringify({
        type: "inject_complete",
        data: {
          device_id: pending.deviceId,
          path,
          file_name,
          success,
          error: error || undefined,
        },
      }),
    );
  }

  if (success) {
    Logger.info(`File injected: ${path}/${file_name} (${reqId})`);
  } else {
    Logger.warn(
      `Inject failed: ${path}/${file_name} — ${error || "unknown"} (${reqId})`,
    );
  }
};
