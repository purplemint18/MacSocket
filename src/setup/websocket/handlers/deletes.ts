import { WebSocket } from "ws";
import { s3Service, uploadService } from "@/services";
import { Logger } from "@/utils";
import type { ExtWebSocket, WebsocketContext } from "../types";

export const handleDeleteFile = async (
  ctx: WebsocketContext,
  ws: ExtWebSocket,
  data: { device_id: string; path: string; is_dir: boolean },
) => {
  const { device_id: delDeviceId, path: delPath, is_dir: delIsDir } = data;
  const delClientWs = ctx.clientSockets.get(delDeviceId);

  if (delClientWs && delClientWs.readyState === WebSocket.OPEN) {
    const requestId = ctx.nextRequestId("del_");

    const timer = setTimeout(() => {
      ctx.pendingRequests.delete(requestId);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "delete_complete",
            data: {
              device_id: delDeviceId,
              path: delPath,
              success: false,
              error: "Request timed out",
            },
          }),
        );
      }
      Logger.warn(`Delete request ${requestId} timed out`);
    }, 60000);

    ctx.pendingRequests.set(requestId, {
      frontendWs: ws,
      deviceId: delDeviceId,
      timer,
    });

    delClientWs.send(
      JSON.stringify({
        type: "request_delete",
        request_id: requestId,
        path: delPath,
        is_dir: delIsDir,
      }),
    );
    Logger.info(
      `Forwarded delete request to ${delDeviceId}: ${delPath} (${requestId})`,
    );
  } else {
    ws.send(
      JSON.stringify({
        type: "delete_complete",
        data: {
          device_id: delDeviceId,
          path: delPath,
          success: false,
          error: "Client is offline",
        },
      }),
    );
  }
};

export const handleDeleteResponse = async (
  ctx: WebsocketContext,
  _ws: ExtWebSocket,
  data: { request_id: string; path: string; success: boolean; error?: string },
) => {
  const {
    request_id: delReqId,
    path: deletedPath,
    success: delSuccess,
    error: delError,
  } = data;
  const delPending = ctx.pendingRequests.get(delReqId);
  if (!delPending) return;

  clearTimeout(delPending.timer);
  ctx.pendingRequests.delete(delReqId);

  if (delSuccess) {
    try {
      const existingUpload = await uploadService.getUploadByDeviceAndPath(
        delPending.deviceId,
        deletedPath,
      );
      if (existingUpload?.s3Url) {
        await s3Service.deleteObjectFromS3(existingUpload.s3Url);
      }
      await uploadService.deleteUploadByPath(delPending.deviceId, deletedPath);
    } catch (err) {
      Logger.warn("Failed to clean up S3 object after delete", err);
    }
  }

  if (delPending.frontendWs.readyState === WebSocket.OPEN) {
    delPending.frontendWs.send(
      JSON.stringify({
        type: "delete_complete",
        data: {
          device_id: delPending.deviceId,
          path: deletedPath,
          success: delSuccess,
          error: delError,
        },
      }),
    );
  }
  Logger.info(
    `Delete ${delSuccess ? "succeeded" : "failed"} for ${deletedPath} (${delReqId})`,
  );
};

