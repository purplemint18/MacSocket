import { WebSocket } from "ws";
import { clientService, s3Service, uploadService } from "@/services";
import { Logger } from "@/utils";
import type { ExtWebSocket, WebsocketContext } from "../types";
import { basenameFromPath } from "../helpers";

export const handleGetUploadList = async (
  _ctx: WebsocketContext,
  ws: ExtWebSocket,
  data: { device_id: string },
) => {
  const { device_id: deviceId } = data;
  try {
    const uploads = await uploadService.getUploadsByDeviceId(deviceId);
    const items = uploads
      .filter((u) => !!u.s3Url)
      .map((u) => ({
        path: u.url,
        s3_url: s3Service.buildS3DownloadPath(
          u.s3Url,
          basenameFromPath(u.url),
        ),
        file_size: u.fileSize,
        created_at: u.createdAt,
      }));

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "upload_list",
          data: { device_id: deviceId, items },
        }),
      );
    }
  } catch (err) {
    Logger.error("Failed to fetch upload list:", err);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "upload_list",
          data: {
            device_id: deviceId,
            items: [],
            error: "Failed to fetch upload list",
          },
        }),
      );
    }
  }
};

export const handleUploadFile = async (
  ctx: WebsocketContext,
  ws: ExtWebSocket,
  data: { device_id: string; path: string },
) => {
  const { device_id: uploadDeviceId, path: uploadPath } = data;
  const uploadClientWs = ctx.clientSockets.get(uploadDeviceId);

  if (uploadClientWs && uploadClientWs.readyState === WebSocket.OPEN) {
    const requestId = ctx.nextRequestId("upl_");

    const timer = setTimeout(() => {
      ctx.pendingRequests.delete(requestId);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "upload_complete",
            data: {
              device_id: uploadDeviceId,
              path: uploadPath,
              success: false,
              error: "Request timed out",
            },
          }),
        );
      }
      Logger.warn(`Upload request ${requestId} timed out`);
    }, 120000);

    ctx.pendingRequests.set(requestId, {
      frontendWs: ws,
      deviceId: uploadDeviceId,
      timer,
    });

    uploadClientWs.send(
      JSON.stringify({
        type: "request_upload",
        request_id: requestId,
        path: uploadPath,
      }),
    );
    Logger.info(
      `Forwarded upload request to ${uploadDeviceId}: ${uploadPath} (${requestId})`,
    );
  } else {
    ws.send(
      JSON.stringify({
        type: "upload_complete",
        data: {
          device_id: uploadDeviceId,
          path: uploadPath,
          success: false,
          error: "Client is offline",
        },
      }),
    );
  }
};

export const handleUploadResponse = async (
  ctx: WebsocketContext,
  _ws: ExtWebSocket,
  data: {
    request_id: string;
    path: string;
    file_data?: string;
    file_size?: number;
    error?: string;
  },
) => {
  const {
    request_id: uplReqId,
    path: uplPath,
    file_data,
    file_size: uplFileSize,
    error: uplError,
  } = data;
  const uplPending = ctx.pendingRequests.get(uplReqId);
  if (!uplPending) return;

  clearTimeout(uplPending.timer);
  ctx.pendingRequests.delete(uplReqId);

  if (uplError || !file_data) {
    if (uplPending.frontendWs.readyState === WebSocket.OPEN) {
      uplPending.frontendWs.send(
        JSON.stringify({
          type: "upload_complete",
          data: {
            device_id: uplPending.deviceId,
            path: uplPath,
            success: false,
            error: uplError || "No file data",
          },
        }),
      );
    }
    return;
  }

  try {
    const fileBuffer = Buffer.from(file_data, "base64");
    const s3Key = s3Service.buildS3ObjectKey(uplPending.deviceId, uplPath);
    await s3Service.uploadBufferToS3(s3Key, fileBuffer, uplPath);
    const downloadPath = s3Service.buildS3DownloadPath(
      s3Key,
      basenameFromPath(uplPath),
    );

    const clientEntity = await clientService.getClientByDeviceId(uplPending.deviceId);
    const existingUpload = await uploadService.getUploadByDeviceAndPath(
      uplPending.deviceId,
      uplPath,
    );
    if (existingUpload?.s3Url) {
      await s3Service.deleteObjectFromS3(existingUpload.s3Url);
    }

    await uploadService.createUpload({
      os: clientEntity?.osType || "unknown",
      deviceId: uplPending.deviceId,
      url: uplPath,
      s3Url: s3Key,
      fileSize: uplFileSize || fileBuffer.length,
    });

    if (uplPending.frontendWs.readyState === WebSocket.OPEN) {
      uplPending.frontendWs.send(
        JSON.stringify({
          type: "upload_complete",
          data: {
            device_id: uplPending.deviceId,
            path: uplPath,
            success: true,
            s3_url: downloadPath,
            file_size: uplFileSize || fileBuffer.length,
          },
        }),
      );
    }
    Logger.info(`File uploaded to S3: ${uplPath} → ${s3Key} (${uplReqId})`);
  } catch (err) {
    Logger.error("Failed to upload file to S3:", err);
    if (uplPending.frontendWs.readyState === WebSocket.OPEN) {
      uplPending.frontendWs.send(
        JSON.stringify({
          type: "upload_complete",
          data: {
            device_id: uplPending.deviceId,
            path: uplPath,
            success: false,
            error: "S3 upload failed",
          },
        }),
      );
    }
  }
};

